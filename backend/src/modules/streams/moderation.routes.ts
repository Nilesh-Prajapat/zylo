import { Router } from 'express';
import { z } from 'zod';
import { ModerationType, UserRole } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { AppError } from '../../common/errors';
import { emitToStream, emitToUser } from '../../realtime/socket';
import { createNotification } from '../notifications/notification.service';

const router = Router();

const muteSchema = z.object({
  userId: z.string(),
  durationMinutes: z.number().min(1).max(60).default(5),
  reason: z.string().max(500).optional(),
});

const banSchema = z.object({
  userId: z.string(),
  durationMinutes: z.number().min(5).max(1440).optional(),
  permanent: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

const unbanSchema = z.object({
  userId: z.string(),
});

// Helper to verify authorization
async function verifyModeratorPermission(streamId: string, moderatorId: string, moderatorRole: UserRole) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== moderatorId && moderatorRole !== UserRole.ADMIN) {
    throw AppError.forbidden('Only stream broadcaster or admin can perform moderation actions');
  }
  return stream;
}

// ─── POST /api/v1/streams/:id/moderation/mute ─────────────────
router.post('/:id/moderation/mute', requireAuth, validate(muteSchema), asyncHandler(async (req, res) => {
  const streamId = req.params.id;
  const moderatorId = req.user!.id;
  const { userId, durationMinutes, reason } = req.body;

  const stream = await verifyModeratorPermission(streamId, moderatorId, req.user!.role);

  if (userId === moderatorId || userId === stream.broadcasterId) {
    throw AppError.badRequest('Cannot mute yourself or the broadcaster');
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const moderation = await prisma.streamModeration.create({
    data: {
      streamId,
      userId,
      moderatorId,
      type: ModerationType.MUTE,
      reason,
      expiresAt,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  // Emit socket events
  emitToUser(userId, 'moderation:muted', {
    streamId,
    durationMinutes,
    expiresAt: expiresAt.toISOString(),
    reason: reason || 'Muted by moderator',
  });

  emitToStream(streamId, 'moderation:user_updated', {
    streamId,
    userId,
    username: moderation.user.username,
    type: 'MUTE',
    expiresAt: expiresAt.toISOString(),
  });

  await createNotification({
    userId,
    type: 'MODERATION_ACTION',
    title: 'Muted on Live Stream',
    message: `You have been muted for ${durationMinutes} minute(s) on "${stream.title}".`,
    entityType: 'STREAM',
    entityId: stream.id,
  });

  sendSuccess(res, { moderation });
}));

// ─── POST /api/v1/streams/:id/moderation/ban ──────────────────
router.post('/:id/moderation/ban', requireAuth, validate(banSchema), asyncHandler(async (req, res) => {
  const streamId = req.params.id;
  const moderatorId = req.user!.id;
  const { userId, durationMinutes, permanent, reason } = req.body;

  const stream = await verifyModeratorPermission(streamId, moderatorId, req.user!.role);

  if (userId === moderatorId || userId === stream.broadcasterId) {
    throw AppError.badRequest('Cannot ban yourself or the broadcaster');
  }

  const type = permanent ? ModerationType.PERMANENT_BAN : ModerationType.TEMPORARY_BAN;
  const expiresAt = permanent || !durationMinutes ? null : new Date(Date.now() + durationMinutes * 60 * 1000);

  const moderation = await prisma.streamModeration.create({
    data: {
      streamId,
      userId,
      moderatorId,
      type,
      reason,
      expiresAt,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
    },
  });

  // Emit socket events
  emitToUser(userId, 'moderation:banned', {
    streamId,
    type,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    reason: reason || 'Banned by moderator',
  });

  emitToStream(streamId, 'moderation:user_updated', {
    streamId,
    userId,
    username: moderation.user.username,
    type,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });

  await createNotification({
    userId,
    type: 'MODERATION_ACTION',
    title: permanent ? 'Permanently Banned' : 'Temporarily Banned',
    message: `You have been banned from "${stream.title}".`,
    entityType: 'STREAM',
    entityId: stream.id,
  });

  sendSuccess(res, { moderation });
}));

// ─── POST /api/v1/streams/:id/moderation/unban ────────────────
router.post('/:id/moderation/unban', requireAuth, validate(unbanSchema), asyncHandler(async (req, res) => {
  const streamId = req.params.id;
  const moderatorId = req.user!.id;
  const { userId } = req.body;

  await verifyModeratorPermission(streamId, moderatorId, req.user!.role);

  const now = new Date();

  // Mark active moderations as revoked
  await prisma.streamModeration.updateMany({
    where: {
      streamId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
    },
  });

  // Emit socket events
  emitToUser(userId, 'moderation:unbanned', { streamId });
  emitToStream(streamId, 'moderation:user_updated', {
    streamId,
    userId,
    type: 'UNBANNED',
  });

  sendSuccess(res, { unbanned: true });
}));

// ─── GET /api/v1/streams/:id/moderation ───────────────────────
router.get('/:id/moderation', requireAuth, asyncHandler(async (req, res) => {
  const streamId = req.params.id;
  await verifyModeratorPermission(streamId, req.user!.id, req.user!.role);

  const now = new Date();

  const activeRestrictions = await prisma.streamModeration.findMany({
    where: {
      streamId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      moderator: { select: { id: true, username: true, displayName: true } },
    },
  });

  sendSuccess(res, { restrictions: activeRestrictions });
}));

export const moderationRouter = router;
