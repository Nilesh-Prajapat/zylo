import { Router } from 'express';
import { z } from 'zod';
import { StreamStatus, WalletTransactionType } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { AppError, ErrorCodes } from '../../common/errors';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../../infrastructure/redis/keys';
import { emitToStream } from '../../realtime/socket';
import { createNotification } from '../notifications/notification.service';

const router = Router();

// GET /api/v1/wallet
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, purchasedCoins: 0, creatorEarnings: 0 },
  });

  const recentTransactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  sendSuccess(res, {
    wallet: {
      purchasedCoins: wallet.purchasedCoins,
      creatorEarnings: wallet.creatorEarnings,
    },
    userRole: req.user!.role,
    transactions: recentTransactions,
  });
}));

// GET /api/v1/wallet/transactions
router.get('/transactions', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const type = req.query.type as WalletTransactionType | undefined;
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

  const where = {
    userId,
    ...(type && Object.values(WalletTransactionType).includes(type) ? { type } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  sendSuccess(res, {
    items: transactions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}));

// Validation Schemas
const topUpSchema = z.object({
  amountCoins: z.number().int().min(10).max(500000),
  amountUsd: z.number().positive(),
  paymentMethod: z.string().optional().default('Visa •••• 4242'),
  idempotencyKey: z.string().optional(),
});

// POST /api/v1/wallet/topup (Fake Payment Flow)
router.post('/topup', requireAuth, validate(topUpSchema), asyncHandler(async (req, res) => {
  const { amountCoins, amountUsd, paymentMethod, idempotencyKey } = req.body;
  const userId = req.user!.id;

  if (idempotencyKey) {
    const existing = await prisma.walletTransaction.findFirst({
      where: { userId, referenceId: idempotencyKey, type: 'TOP_UP' },
    });
    if (existing) {
      const currentWallet = await prisma.wallet.findUnique({ where: { userId } });
      sendSuccess(res, { wallet: currentWallet, transaction: existing, message: 'Transaction already completed' });
      return;
    }
  }

  // Transactionally credit purchasedCoins and add transaction
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: { purchasedCoins: { increment: amountCoins } },
      create: { userId, purchasedCoins: amountCoins, creatorEarnings: 0 },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        userId,
        type: 'TOP_UP',
        balanceType: 'PERSONAL_COINS',
        direction: 'CREDIT',
        amount: amountCoins,
        amountUsd,
        currency: 'USD',
        referenceId: idempotencyKey || `topup_${Date.now()}`,
        description: `Top Up +${amountCoins.toLocaleString()} Coins ($${amountUsd.toFixed(2)}) via ${paymentMethod}`,
        status: 'COMPLETED',
      },
    });

    return { wallet, transaction };
  });

  // Create notification
  await createNotification({
    userId,
    type: 'TOP_UP_SUCCESS',
    title: 'Top Up Successful!',
    message: `${amountCoins.toLocaleString()} coins were added to your wallet`,
    entityType: 'WALLET_TRANSACTION',
    entityId: result.transaction.id,
  });

  sendSuccess(res, {
    wallet: {
      purchasedCoins: result.wallet.purchasedCoins,
      creatorEarnings: result.wallet.creatorEarnings,
    },
    transaction: result.transaction,
  }, 201);
}));

const redeemSchema = z.object({
  couponTitle: z.string().min(1),
  earningsDeducted: z.number().int().positive(),
  usdValue: z.number().positive(),
});

// POST /api/v1/wallet/redeem (Creator Earnings Coupon Redemption)
router.post('/redeem', requireAuth, validate(redeemSchema), asyncHandler(async (req, res) => {
  const { couponTitle, earningsDeducted, usdValue } = req.body;
  const userId = req.user!.id;

  const result = await prisma.$transaction(async (tx) => {
    // Lock wallet with FOR UPDATE
    const wallets = await tx.$queryRawUnsafe<Array<{ id: string; creatorEarnings: number }>>(
      `SELECT id, "creatorEarnings" FROM wallets WHERE "userId" = $1 FOR UPDATE`,
      userId
    );

    if (!wallets.length) throw AppError.notFound('Wallet not found');
    const wallet = wallets[0];

    if (wallet.creatorEarnings < earningsDeducted) {
      throw AppError.badRequest(`Insufficient creator earnings. Required: ${earningsDeducted}, Available: ${wallet.creatorEarnings}`);
    }

    // Deduct creatorEarnings
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { creatorEarnings: { decrement: earningsDeducted } },
    });

    // Generate test coupon code ZYLO-XXXX-XXXX
    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `ZYLO-${randomPart1}-${randomPart2}`;

    const redemption = await tx.couponRedemption.create({
      data: {
        userId,
        couponCode,
        couponTitle,
        earningsDeducted,
        usdValue,
        status: 'COMPLETED',
      },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        userId,
        type: 'REDEMPTION',
        balanceType: 'CREATOR_EARNINGS',
        direction: 'DEBIT',
        amount: earningsDeducted,
        amountUsd: usdValue,
        currency: 'USD',
        referenceId: redemption.id,
        description: `Redeemed ${couponTitle} (Code: ${couponCode})`,
        status: 'COMPLETED',
      },
    });

    return { updatedWallet, redemption, transaction };
  });

  // Create notification
  await createNotification({
    userId,
    type: 'REDEMPTION_SUCCESS',
    title: 'Redemption Successful!',
    message: `Your ${couponTitle} redemption was successful. Coupon code: ${result.redemption.couponCode}`,
    entityType: 'COUPON_REDEMPTION',
    entityId: result.redemption.id,
  });

  sendSuccess(res, {
    wallet: {
      purchasedCoins: result.updatedWallet.purchasedCoins,
      creatorEarnings: result.updatedWallet.creatorEarnings,
    },
    redemption: result.redemption,
    transaction: result.transaction,
  }, 201);
}));

// GET /api/v1/wallet/redemptions (Coupon History)
router.get('/redemptions', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const redemptions = await prisma.couponRedemption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  sendSuccess(res, { redemptions });
}));

export const walletRouter = router;

// ─── Gifts Router ─────────────────────────────────────────────

const giftsRouter = Router();

const sendGiftSchema = z.object({
  giftId: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
  idempotencyKey: z.string().min(1),
  balanceSource: z.enum(['PERSONAL_COINS', 'CREATOR_EARNINGS']).default('PERSONAL_COINS'),
});

// GET /api/v1/gifts
giftsRouter.get('/', asyncHandler(async (req, res) => {
  const redis = getRedis();
  const cached = await redis.get(RedisKeys.giftsCatalog());

  if (cached) {
    sendSuccess(res, { gifts: JSON.parse(cached) });
    return;
  }

  const gifts = await prisma.gift.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  await redis.setex(RedisKeys.giftsCatalog(), RedisTTL.GIFT_CATALOG_CACHE, JSON.stringify(gifts));

  sendSuccess(res, { gifts });
}));

// POST /api/v1/gifts/streams/:id
giftsRouter.post('/streams/:id', requireAuth, validate(sendGiftSchema), asyncHandler(async (req, res) => {
  const { giftId, quantity = 1, idempotencyKey, balanceSource = 'PERSONAL_COINS' } = req.body;
  const streamId = req.params.id;
  const senderId = req.user!.id;

  // Check idempotency
  const existingTx = await prisma.giftTransaction.findUnique({
    where: { senderId_idempotencyKey: { senderId, idempotencyKey } },
  });

  if (existingTx) {
    sendSuccess(res, { transaction: existingTx, message: 'Transaction already processed' });
    return;
  }

  // Validate stream
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) throw AppError.notFound('Stream not found');
  if (stream.status !== StreamStatus.LIVE) {
    throw new AppError(400, ErrorCodes.STREAM_NOT_LIVE, 'Gifts can only be sent to live streams');
  }

  // Cannot gift yourself
  if (stream.broadcasterId === senderId) {
    throw AppError.badRequest('Cannot send gifts to your own stream');
  }

  // Creator Earnings balance source requires CREATOR or ADMIN role
  if (balanceSource === 'CREATOR_EARNINGS' && req.user!.role === 'NORMAL_USER') {
    throw AppError.badRequest('Only creators can send gifts using Creator Earnings');
  }

  // Validate gift
  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.isActive) {
    throw new AppError(404, ErrorCodes.GIFT_NOT_FOUND, 'Gift not found');
  }

  const totalPrice = gift.price * quantity;

  // Process gift transactionally with two-balance model
  const transaction = await prisma.$transaction(async (tx) => {
    // Lock sender wallet
    const senderWallets = await tx.$queryRawUnsafe<Array<{ id: string; purchasedCoins: number; creatorEarnings: number }>>(
      `SELECT id, "purchasedCoins", "creatorEarnings" FROM wallets WHERE "userId" = $1 FOR UPDATE`,
      senderId
    );

    if (!senderWallets.length) throw AppError.notFound('Sender wallet not found');
    const senderWallet = senderWallets[0];

    if (balanceSource === 'CREATOR_EARNINGS') {
      if (senderWallet.creatorEarnings < totalPrice) {
        throw new AppError(400, ErrorCodes.INSUFFICIENT_BALANCE, `Insufficient creator earnings balance. Required: ${totalPrice}, Available: ${senderWallet.creatorEarnings}`);
      }
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { creatorEarnings: { decrement: totalPrice } },
      });
    } else {
      if (senderWallet.purchasedCoins < totalPrice) {
        throw new AppError(400, ErrorCodes.INSUFFICIENT_BALANCE, `Insufficient coin balance. Required: ${totalPrice}, Available: ${senderWallet.purchasedCoins}`);
      }
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { purchasedCoins: { decrement: totalPrice } },
      });
    }

    // Credit creator earnings to broadcaster
    await tx.wallet.upsert({
      where: { userId: stream.broadcasterId },
      update: { creatorEarnings: { increment: totalPrice } },
      create: { userId: stream.broadcasterId, purchasedCoins: 0, creatorEarnings: totalPrice },
    });

    // Create GiftTransaction record
    const giftTx = await tx.giftTransaction.create({
      data: {
        senderId,
        recipientId: stream.broadcasterId,
        giftId: gift.id,
        streamId: stream.id,
        quantity,
        totalPrice,
        idempotencyKey,
      },
      include: {
        gift: { select: { name: true, emoji: true, price: true } },
        sender: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });

    // Create dual WalletTransactions
    // 1. Sender (DEBIT PERSONAL_COINS)
    await tx.walletTransaction.create({
      data: {
        userId: senderId,
        type: 'GIFT_SENT',
        balanceType: balanceSource === 'CREATOR_EARNINGS' ? 'CREATOR_EARNINGS' : 'PERSONAL_COINS',
        direction: 'DEBIT',
        amount: totalPrice,
        referenceId: giftTx.id,
        description: `Sent ${gift.name} (${gift.emoji} x${quantity}) on "${stream.title}"`,
        status: 'COMPLETED',
      },
    });

    // 2. Recipient (CREDIT CREATOR_EARNINGS)
    await tx.walletTransaction.create({
      data: {
        userId: stream.broadcasterId,
        type: 'GIFT_RECEIVED',
        balanceType: 'CREATOR_EARNINGS',
        direction: 'CREDIT',
        amount: totalPrice,
        referenceId: giftTx.id,
        description: `Received ${gift.name} (${gift.emoji} x${quantity}) from @${req.user!.username}`,
        status: 'COMPLETED',
      },
    });

    return giftTx;
  });

  // Create notification for recipient
  const senderName = req.user!.displayName || req.user!.username;
  await createNotification({
    userId: stream.broadcasterId,
    type: 'GIFT_RECEIVED',
    title: 'Gift Received!',
    message: `You received ${quantity}x ${gift.name} (${gift.emoji}) from @${senderName}`,
    entityType: 'GIFT_TRANSACTION',
    entityId: transaction.id,
  });

  // Emit realtime gift event to stream chat/room
  emitToStream(stream.id, 'gift:sent', {
    senderName,
    giftName: gift.name,
    giftEmoji: gift.emoji,
    quantity,
    totalPrice,
  });

  sendSuccess(res, { transaction }, 201);
}));

export { giftsRouter };
