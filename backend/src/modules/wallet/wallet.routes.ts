import { Router } from 'express';
import { z } from 'zod';
import { StreamStatus, WalletTransactionType } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { AppError, ErrorCodes } from '../../common/errors';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../../infrastructure/redis/keys';
import { emitToStream, emitToUser } from '../../realtime/socket';
import { createNotification } from '../notifications/notification.service';
import { createRazorpayOrder, verifyRazorpaySignature } from '../../infrastructure/payment/razorpay.service';
import { env } from '../../config/env';

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
const createTopupOrderSchema = z.object({
  amountInr: z.number().int().min(10).max(100000),
});

const verifyTopupSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  topup_id: z.string().optional(),
});

// POST /api/v1/wallet/topup/order (Create Razorpay Order server-side)
router.post('/topup/order', requireAuth, validate(createTopupOrderSchema), asyncHandler(async (req, res) => {
  const { amountInr } = req.body;
  const userId = req.user!.id;

  // Rate: ₹10 = 100 credits (1 INR = 10 credits)
  const credits = Math.floor(amountInr * 10);
  const receiptId = `topup_${userId.substring(0, 8)}_${Date.now()}`;

  // 1. Create order on Razorpay API server side
  const razorpayOrder = await createRazorpayOrder({
    amountInr,
    receiptId,
    notes: { userId, credits: credits.toString() },
  });

  // 2. Save internal topup record with CREATED status
  const topup = await prisma.walletTopup.create({
    data: {
      userId,
      razorpayOrderId: razorpayOrder.id,
      amountInr,
      currency: 'INR',
      credits,
      status: 'CREATED',
    },
  });

  sendSuccess(res, {
    orderId: razorpayOrder.id,
    amountInr,
    credits,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID || 'rzp_test_TfChcyTibFslfx',
    topupId: topup.id,
  }, 201);
}));

// POST /api/v1/wallet/topup/verify (API-based Razorpay signature verification & atomic crediting)
router.post('/topup/verify', requireAuth, validate(verifyTopupSchema), asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, topup_id } = req.body;
  const userId = req.user!.id;

  // 1. Verify Razorpay signature server-side
  const isValid = verifyRazorpaySignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  if (!isValid) {
    throw AppError.badRequest('Invalid payment signature verification failed.');
  }

  // 2. Find internal top-up record
  let topup = await prisma.walletTopup.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!topup && topup_id) {
    topup = await prisma.walletTopup.findUnique({ where: { id: topup_id } });
  }

  if (!topup) {
    throw AppError.notFound('Top-up transaction record not found');
  }

  if (topup.userId !== userId) {
    throw AppError.forbidden('Unauthorized to verify this top-up transaction');
  }

  // 3. Exactly-once idempotency check
  if (topup.status === 'CREDITED') {
    const currentWallet = await prisma.wallet.findUnique({ where: { userId } });
    sendSuccess(res, {
      wallet: currentWallet,
      topup,
      message: 'Payment already verified and credited',
    });
    return;
  }

  // 4. Atomic transaction to credit wallet & update top-up status
  const result = await prisma.$transaction(async (tx) => {
    // Mark topup record CREDITED
    const updatedTopup = await tx.walletTopup.update({
      where: { id: topup.id },
      data: {
        status: 'CREDITED',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        completedAt: new Date(),
      },
    });

    // Credit purchasedCoins in wallet
    const updatedWallet = await tx.wallet.upsert({
      where: { userId },
      update: { purchasedCoins: { increment: topup.credits } },
      create: { userId, purchasedCoins: topup.credits, creatorEarnings: 0 },
    });

    // Create WalletTransaction record
    const walletTx = await tx.walletTransaction.create({
      data: {
        userId,
        type: 'TOP_UP',
        balanceType: 'PERSONAL_COINS',
        direction: 'CREDIT',
        amount: topup.credits,
        amountUsd: topup.amountInr / 80,
        currency: 'INR',
        referenceId: topup.razorpayOrderId,
        description: `Razorpay Top Up +${topup.credits.toLocaleString()} Credits (₹${topup.amountInr})`,
        status: 'COMPLETED',
        metadata: {
          razorpayOrderId: topup.razorpayOrderId,
          razorpayPaymentId: razorpay_payment_id,
        },
      },
    });

    return { wallet: updatedWallet, transaction: walletTx, topup: updatedTopup };
  });

  // 5. Emit real-time WebSocket wallet update
  emitToUser(userId, 'wallet:balance_updated', {
    wallet: {
      purchasedCoins: result.wallet.purchasedCoins,
      creatorEarnings: result.wallet.creatorEarnings,
    },
    transaction: result.transaction,
  });

  // 6. Create notification
  await createNotification({
    userId,
    type: 'TOP_UP_SUCCESS',
    title: 'Top Up Successful!',
    message: `₹${topup.amountInr} payment verified. ${topup.credits.toLocaleString()} credits added to your wallet.`,
    entityType: 'WALLET_TRANSACTION',
    entityId: result.transaction.id,
  });

  sendSuccess(res, {
    wallet: {
      purchasedCoins: result.wallet.purchasedCoins,
      creatorEarnings: result.wallet.creatorEarnings,
    },
    transaction: result.transaction,
    topup: result.topup,
  }, 200);
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
  const giftPayload = {
    id: transaction.id,
    gift: { id: gift.id, name: gift.name, emoji: gift.emoji, price: gift.price },
    sender: { id: senderId, username: req.user!.username, displayName: senderName, avatarUrl: req.user!.avatarUrl },
    receiverId: stream.broadcasterId,
    senderName,
    giftName: gift.name,
    giftEmoji: gift.emoji,
    quantity,
    totalPrice,
    createdAt: transaction.createdAt.toISOString(),
  };

  emitToStream(stream.id, 'gift:received', giftPayload);
  emitToStream(stream.id, 'gift:sent', giftPayload);

  sendSuccess(res, { transaction }, 201);
}));

export { giftsRouter };
