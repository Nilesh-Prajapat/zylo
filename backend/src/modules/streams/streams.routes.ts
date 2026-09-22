import { Router } from 'express';
import { z } from 'zod';
import { StreamStatus, UserRole, RecordingStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, requireRole, asyncHandler, sendSuccess, validate, optionalAuth } from '../../common/middleware';
import { AppError, ErrorCodes } from '../../common/errors';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../../infrastructure/redis/keys';
import { getMediaProvider } from '../../infrastructure/media/livekit.provider';
import { env } from '../../config/env';
import { emitToStream } from '../../realtime/socket';
import { deleteFromR2 } from '../../infrastructure/storage/r2';
import { createNotification } from '../notifications/notification.service';

const router = Router();

// ─── Validators ───────────────────────────────────────────────

const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional(),
  categoryId: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('PUBLIC'),
  language: z.string().max(50).default('English'),
  enableChat: z.boolean().default(true),
  enableGifts: z.boolean().default(true),
  saveRecording: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional(),
});

// Whitelist of fields allowed for stream updates
const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
  language: z.string().max(50).optional(),
  enableChat: z.boolean().optional(),
  enableGifts: z.boolean().optional(),
  saveRecording: z.boolean().optional(),
  publicationStatus: z.enum(['PUBLISHED', 'HIDDEN']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const ALLOWED_TRANSITIONS: Record<StreamStatus, StreamStatus[]> = {
  SCHEDULED: [StreamStatus.LIVE, StreamStatus.CANCELLED, StreamStatus.ENDED],
  LIVE: [StreamStatus.ENDED],
  ENDED: [],
  CANCELLED: [],
};

// ─── POST /api/v1/streams ─────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole(UserRole.CREATOR),
  validate(createStreamSchema),
  asyncHandler(async (req, res) => {
    const {
      title, description, thumbnailUrl, categoryId, visibility,
      language, enableChat, enableGifts, saveRecording, scheduledAt,
    } = req.body;
    const broadcasterId = req.user!.id;

    // Check for active stream
    const activeLive = await prisma.stream.findFirst({
      where: { broadcasterId, status: { in: [StreamStatus.LIVE, StreamStatus.SCHEDULED] } },
    });
    if (activeLive && activeLive.status === StreamStatus.LIVE) {
      throw new AppError(409, ErrorCodes.ALREADY_BROADCASTING, 'You already have an active live stream');
    }

    // Validate categoryId if provided
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) throw AppError.badRequest('Invalid category');
    }

    // Always create stream in SCHEDULED state — creator must explicitly START LIVE
    const stream = await prisma.stream.create({
      data: {
        broadcasterId,
        title,
        description,
        thumbnailUrl,
        categoryId: categoryId || null,
        visibility,
        language,
        enableChat,
        enableGifts,
        saveRecording,
        status: StreamStatus.SCHEDULED,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        mediaProvider: 'LIVEKIT',
        recordingStatus: RecordingStatus.NOT_STARTED,
      },
      include: {
        broadcaster: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const livekitRoomName = `zylo-room-${stream.publicId}`;

    // Attempt LiveKit room creation
    try {
      const mediaProvider = getMediaProvider();
      await mediaProvider.createRoom(livekitRoomName);
    } catch (err) {
      // If LiveKit fails, clean up the stream
      await prisma.stream.delete({ where: { id: stream.id } });
      throw AppError.internal('Failed to create LiveKit room. Please try again.');
    }

    // Update with room name after successful LiveKit creation
    await prisma.stream.update({
      where: { id: stream.id },
      data: { livekitRoomName },
    });

    // Generate Publisher token for Creator (for preview in studio)
    const mediaProvider = getMediaProvider();
    const token = await mediaProvider.generateToken({
      roomName: livekitRoomName,
      participantIdentity: req.user!.id,
      participantName: req.user!.displayName || req.user!.username,
      isPublisher: true,
    });

    // Invalidate caches
    const redis = getRedis();
    await redis.del(RedisKeys.upcomingStreams());

    sendSuccess(
      res,
      {
        stream: { ...stream, livekitRoomName },
        token,
        livekitUrl: env.LIVEKIT_URL,
      },
      201
    );
  })
);

// ─── POST /api/v1/streams/:id/start ───────────────────────────
// Transitions a SCHEDULED stream to LIVE — creator must explicitly click START LIVE

router.post('/:id/start', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== req.user!.id) {
    throw AppError.forbidden('Not authorized to start this stream');
  }

  if (stream.status !== StreamStatus.SCHEDULED) {
    if (stream.status === StreamStatus.LIVE) {
      // Already live — idempotent
      sendSuccess(res, { stream });
      return;
    }
    throw new AppError(400, ErrorCodes.INVALID_STREAM_TRANSITION,
      `Cannot start a stream with status ${stream.status}`);
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: {
      status: StreamStatus.LIVE,
      startedAt: new Date(),
      recordingStatus: stream.saveRecording ? RecordingStatus.RECORDING : RecordingStatus.NOT_STARTED,
    },
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  // Invalidate caches
  const redis = getRedis();
  await redis.del(RedisKeys.liveStreams());
  await redis.del(RedisKeys.upcomingStreams());
  await redis.del(RedisKeys.streamCache(stream.id));

  // Broadcast realtime event
  emitToStream(stream.id, 'stream:status_changed', {
    streamId: stream.id,
    status: StreamStatus.LIVE,
    startedAt: updated.startedAt?.toISOString(),
  });

  // Notify followers asynchronously
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: stream.broadcasterId },
      select: { followerId: true },
    });
    const broadcasterName = updated.broadcaster.displayName || updated.broadcaster.username;
    for (const f of followers) {
      createNotification({
        userId: f.followerId,
        type: 'STREAM_LIVE',
        title: `${broadcasterName} is LIVE!`,
        message: `${broadcasterName} started streaming: "${updated.title}"`,
        entityType: 'STREAM',
        entityId: stream.id,
      });
    }
  } catch (err) {
    // Non-fatal notification failure
  }

  sendSuccess(res, { stream: updated });
}));

// ─── GET /api/v1/streams/mine/active ──────────────────────────

router.get('/mine/active', requireAuth, asyncHandler(async (req, res) => {
  const activeStream = await prisma.stream.findFirst({
    where: {
      broadcasterId: req.user!.id,
      status: StreamStatus.LIVE,
    },
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  sendSuccess(res, { stream: activeStream || null });
}));

// ─── GET /api/v1/streams/mine ─────────────────────────────────

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
  const search = (req.query.search as string || '').trim();
  const status = req.query.status as StreamStatus | undefined;
  const visibility = req.query.visibility as string | undefined;

  const where: any = {
    broadcasterId: req.user!.id,
    ...(status && { status }),
    ...(visibility && { visibility }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.stream.count({ where }),
    prisma.stream.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        broadcaster: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  sendSuccess(res, {
    items,
    streams: items, // Backward compatibility
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}));

// ─── GET /api/v1/streams/mine/stats ───────────────────────────

router.get('/mine/stats', requireAuth, asyncHandler(async (req, res) => {
  const broadcasterId = req.user!.id;

  const [totalStreams, totalViewsAgg, followerCount, totalGiftsAgg] = await Promise.all([
    prisma.stream.count({ where: { broadcasterId } }),
    prisma.stream.aggregate({ where: { broadcasterId }, _sum: { viewerCount: true } }),
    prisma.follow.count({ where: { followingId: broadcasterId } }),
    prisma.giftTransaction.aggregate({ where: { recipientId: broadcasterId }, _sum: { totalPrice: true } }),
  ]);

  sendSuccess(res, {
    totalStreams,
    totalViews: totalViewsAgg._sum.viewerCount || 0,
    followers: followerCount,
    totalGifts: totalGiftsAgg._sum.totalPrice || 0,
  });
}));

// ─── PATCH /api/v1/streams/:id/publication ─────────────────────

router.patch('/:id/publication', requireAuth, asyncHandler(async (req, res) => {
  const { publicationStatus } = req.body;
  if (!['PUBLISHED', 'HIDDEN'].includes(publicationStatus)) {
    throw AppError.badRequest('Invalid publication status');
  }

  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to modify this stream');
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: { publicationStatus },
  });

  sendSuccess(res, { stream: updated });
}));

// ─── GET /api/v1/streams/live ─────────────────────────────────

router.get('/live', optionalAuth, asyncHandler(async (req, res) => {
  const redis = getRedis();
  const cached = await redis.get(RedisKeys.liveStreams());

  if (cached) {
    sendSuccess(res, { streams: JSON.parse(cached) });
    return;
  }

  const streams = await prisma.stream.findMany({
    where: { status: StreamStatus.LIVE },
    orderBy: { viewerCount: 'desc' },
    take: 50,
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  // Enrich with Redis viewer counts
  for (const stream of streams) {
    const count = await redis.scard(RedisKeys.streamViewers(stream.id));
    if (count > 0) {
      (stream as any).viewerCount = count;
    }
  }

  await redis.setex(RedisKeys.liveStreams(), RedisTTL.LIVE_STREAMS_CACHE, JSON.stringify(streams));

  sendSuccess(res, { streams });
}));

// ─── GET /api/v1/streams/upcoming ─────────────────────────────

router.get('/upcoming', asyncHandler(async (req, res) => {
  const redis = getRedis();
  const cached = await redis.get(RedisKeys.upcomingStreams());

  if (cached) {
    sendSuccess(res, { streams: JSON.parse(cached) });
    return;
  }

  const streams = await prisma.stream.findMany({
    where: {
      status: StreamStatus.SCHEDULED,
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  await redis.setex(RedisKeys.upcomingStreams(), RedisTTL.UPCOMING_STREAMS_CACHE, JSON.stringify(streams));

  sendSuccess(res, { streams });
}));

// ─── GET /api/v1/streams/:id/token (Viewer LiveKit Token) ─────

router.get('/:id/token', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.status !== StreamStatus.LIVE) {
    throw new AppError(400, ErrorCodes.STREAM_NOT_LIVE, 'Stream is not currently live');
  }

  const mediaProvider = getMediaProvider();
  const token = await mediaProvider.generateToken({
    roomName: stream.livekitRoomName || `zylo-room-${stream.publicId}`,
    participantIdentity: req.user!.id,
    participantName: req.user!.displayName || req.user!.username,
    isPublisher: req.user!.id === stream.broadcasterId,
  });

  sendSuccess(res, {
    token,
    livekitUrl: env.LIVEKIT_URL,
    roomName: stream.livekitRoomName,
  });
}));

// ─── GET /api/v1/streams/:id/chat ─────────────────────────────

router.get('/:id/chat', optionalAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const before = req.query.before as string | undefined;

  const messages = await prisma.chatMessage.findMany({
    where: {
      streamId: stream.id,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  // Return in chronological order
  sendSuccess(res, { messages: messages.reverse() });
}));

// ─── GET /api/v1/streams/:id ──────────────────────────────────

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  if (!stream) {
    throw new AppError(404, ErrorCodes.STREAM_NOT_FOUND, 'Stream not found');
  }

  const redis = getRedis();
  if (stream.status === StreamStatus.LIVE) {
    const count = await redis.scard(RedisKeys.streamViewers(stream.id));
    (stream as any).viewerCount = Math.max(stream.viewerCount, count);
  }

  let isFollowing = false;
  if (req.user && req.user.id !== stream.broadcasterId) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: req.user.id, followingId: stream.broadcasterId },
      },
    });
    isFollowing = !!follow;
  }

  sendSuccess(res, { stream, isFollowing });
}));

// ─── PATCH /api/v1/streams/:id ────────────────────────────────

router.patch('/:id', requireAuth, validate(updateStreamSchema), asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });

  if (!stream) throw AppError.notFound('Stream not found');
  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to modify this stream');
  }

  // For ENDED streams, only allow replay metadata edits
  const allowedEndedFields = ['title', 'description', 'thumbnailUrl', 'categoryId', 'visibility', 'publicationStatus', 'language'];
  if (stream.status === StreamStatus.ENDED) {
    const updateKeys = Object.keys(req.body);
    const invalidKeys = updateKeys.filter(k => !allowedEndedFields.includes(k));
    if (invalidKeys.length > 0) {
      throw AppError.badRequest(`Cannot modify ${invalidKeys.join(', ')} on an ended stream`);
    }
  }

  // Whitelist: only use validated fields from Zod schema (never pass raw req.body)
  const updateData: any = {};
  const validFields = [
    'title', 'description', 'thumbnailUrl', 'categoryId', 'visibility',
    'language', 'enableChat', 'enableGifts', 'saveRecording', 'publicationStatus', 'scheduledAt',
  ];
  for (const field of validFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: updateData,
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const redis = getRedis();
  await redis.del(RedisKeys.streamCache(stream.id));
  await redis.del(RedisKeys.liveStreams());
  await redis.del(RedisKeys.upcomingStreams());

  sendSuccess(res, { stream: updated });
}));

// ─── POST /api/v1/streams/:id/end ────────────────────────────

router.post('/:id/end', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to end this stream');
  }

  // Idempotent: if already ENDED, return current state
  if (stream.status === StreamStatus.ENDED) {
    sendSuccess(res, { stream });
    return;
  }

  if (!ALLOWED_TRANSITIONS[stream.status].includes(StreamStatus.ENDED)) {
    throw new AppError(400, ErrorCodes.INVALID_STREAM_TRANSITION,
      `Cannot transition from ${stream.status} to ENDED`);
  }

  const redis = getRedis();
  const finalViewerCount = await redis.scard(RedisKeys.streamViewers(stream.id));
  const peakViewers = parseInt(await redis.get(RedisKeys.streamPeakViewers(stream.id)) || '0');
  const endedAt = new Date();

  // Calculate duration in seconds
  const duration = stream.startedAt
    ? (endedAt.getTime() - new Date(stream.startedAt).getTime()) / 1000
    : 0;

  // Determine recording status: if recording was enabled, set to PROCESSING
  // Do NOT set to READY — that only happens when actual recording is confirmed
  const newRecordingStatus = stream.saveRecording && stream.recordingStatus === RecordingStatus.RECORDING
    ? RecordingStatus.PROCESSING
    : stream.recordingStatus;

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: {
      status: StreamStatus.ENDED,
      endedAt,
      duration,
      viewerCount: Math.max(stream.viewerCount, finalViewerCount),
      peakViewerCount: Math.max(stream.peakViewerCount, peakViewers),
      recordingStatus: newRecordingStatus,
      // Do NOT generate a fake replayUrl — it must come from actual recording completion
    },
  });

  // End LiveKit room
  if (stream.livekitRoomName) {
    try {
      const mediaProvider = getMediaProvider();
      await mediaProvider.endRoom(stream.livekitRoomName);
    } catch (err) {
      // Non-fatal: room may already be closed
    }
  }

  // Clean up Redis viewer data
  await redis.del(RedisKeys.streamViewers(stream.id));
  await redis.del(RedisKeys.streamConnections(stream.id));
  await redis.del(RedisKeys.streamPeakViewers(stream.id));
  await redis.del(RedisKeys.liveStreams());
  await redis.del(RedisKeys.streamCache(stream.id));

  // Broadcast realtime event
  emitToStream(stream.id, 'stream:status_changed', {
    streamId: stream.id,
    status: StreamStatus.ENDED,
    endedAt: endedAt.toISOString(),
  });

  sendSuccess(res, { stream: updated });
}));

// ─── POST /api/v1/streams/:id/join ────────────────────────────

router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream) throw AppError.notFound('Stream not found');

  // Don't count broadcaster as viewer
  if (stream.broadcasterId === req.user!.id) {
    sendSuccess(res, { viewerCount: 0 });
    return;
  }

  const redis = getRedis();
  await redis.sadd(RedisKeys.streamViewers(stream.id), req.user!.id);

  const viewerCount = await redis.scard(RedisKeys.streamViewers(stream.id));

  const currentPeak = parseInt(await redis.get(RedisKeys.streamPeakViewers(stream.id)) || '0');
  if (viewerCount > currentPeak) {
    await redis.set(RedisKeys.streamPeakViewers(stream.id), viewerCount.toString());
  }

  sendSuccess(res, { viewerCount });
}));

// ─── POST /api/v1/streams/:id/leave ───────────────────────────

router.post('/:id/leave', requireAuth, asyncHandler(async (req, res) => {
  const redis = getRedis();
  await redis.srem(RedisKeys.streamViewers(req.params.id), req.user!.id);

  const viewerCount = await redis.scard(RedisKeys.streamViewers(req.params.id));
  sendSuccess(res, { viewerCount });
}));

// ─── GET /api/v1/streams (paginated list) ─────────────────────

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;
  const status = req.query.status as StreamStatus | undefined;
  const broadcasterId = req.query.broadcasterId as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (broadcasterId) where.broadcasterId = broadcasterId;

  const streams = await prisma.stream.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const hasMore = streams.length > limit;
  const items = hasMore ? streams.slice(0, limit) : streams;

  sendSuccess(res, {
    streams: items,
    pagination: {
      hasMore,
      cursor: hasMore ? items[items.length - 1].id : undefined,
    },
  });
}));

// ─── POST /api/v1/streams/:id/cancel ──────────────────────────

router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to cancel this stream');
  }

  if (stream.status === StreamStatus.CANCELLED) {
    sendSuccess(res, { stream });
    return;
  }

  if (stream.status !== StreamStatus.SCHEDULED) {
    throw new AppError(400, ErrorCodes.INVALID_STREAM_TRANSITION,
      `Cannot cancel a stream with status ${stream.status}`);
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: { status: StreamStatus.CANCELLED },
  });

  const redis = getRedis();
  await redis.del(RedisKeys.upcomingStreams());
  await redis.del(RedisKeys.streamCache(stream.id));

  // Broadcast realtime event
  emitToStream(stream.id, 'stream:status_changed', {
    streamId: stream.id,
    status: StreamStatus.CANCELLED,
  });

  sendSuccess(res, { stream: updated });
}));

// ─── DELETE /api/v1/streams/:id ───────────────────────────────

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to delete this stream');
  }

  if (stream.status === StreamStatus.LIVE) {
    throw AppError.badRequest('Cannot delete an active live stream. End the stream first.');
  }

  if (stream.recordingStorageKey) {
    try {
      await deleteFromR2(stream.recordingStorageKey);
    } catch (err) {
      // Non-fatal if key already deleted
    }
  }

  await prisma.stream.delete({ where: { id: stream.id } });

  const redis = getRedis();
  await redis.del(RedisKeys.liveStreams());
  await redis.del(RedisKeys.upcomingStreams());
  await redis.del(RedisKeys.streamCache(stream.id));

  sendSuccess(res, { deleted: true });
}));

// ─── GET /api/v1/streams/following/feed ──────────────────────

router.get('/following/feed', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true, following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  const followingIds = follows.map(f => f.followingId);

  if (followingIds.length === 0) {
    sendSuccess(res, { creators: [], liveStreams: [], recentlyPublished: [] });
    return;
  }

  const liveStreams = await prisma.stream.findMany({
    where: {
      broadcasterId: { in: followingIds },
      status: StreamStatus.LIVE,
    },
    orderBy: { startedAt: 'desc' },
    include: {
      broadcaster: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const liveBroadcasterIds = new Set(liveStreams.map(s => s.broadcasterId));

  const creators = follows.map(f => ({
    ...f.following,
    isLive: liveBroadcasterIds.has(f.followingId),
  }));

  const recentlyPublished = await prisma.stream.findMany({
    where: {
      broadcasterId: { in: followingIds },
      status: StreamStatus.ENDED,
      recordingStatus: RecordingStatus.READY,
      publicationStatus: 'PUBLISHED',
    },
    orderBy: { endedAt: 'desc' },
    take: 20,
    include: {
      broadcaster: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  sendSuccess(res, { creators, liveStreams, recentlyPublished });
}));

// ─── GET /api/v1/streams/:id/analytics ───────────────────────

router.get('/:id/analytics', requireAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');
  if (stream.broadcasterId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Not authorized to view stream analytics');
  }

  const [chatCount, uniqueChattersAgg, giftsAgg, giftCount, followersGained] = await Promise.all([
    prisma.chatMessage.count({ where: { streamId: stream.id } }),
    prisma.chatMessage.groupBy({
      by: ['userId'],
      where: { streamId: stream.id },
    }),
    prisma.giftTransaction.aggregate({
      where: { streamId: stream.id },
      _sum: { totalPrice: true },
    }),
    prisma.giftTransaction.count({ where: { streamId: stream.id } }),
    stream.startedAt ? prisma.follow.count({
      where: {
        followingId: stream.broadcasterId,
        createdAt: {
          gte: stream.startedAt,
          ...(stream.endedAt ? { lte: stream.endedAt } : {}),
        },
      },
    }) : Promise.resolve(0),
  ]);

  const topSupportersRaw = await prisma.giftTransaction.groupBy({
    by: ['senderId'],
    where: { streamId: stream.id },
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 10,
  });

  const supporterUserIds = topSupportersRaw.map(s => s.senderId);
  const users = await prisma.user.findMany({
    where: { id: { in: supporterUserIds } },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const topSupporters = topSupportersRaw.map(s => ({
    user: userMap.get(s.senderId),
    totalPoints: s._sum.totalPrice || 0,
  }));

  const totalGiftPoints = giftsAgg._sum.totalPrice || 0;
  const avgConcurrentViewers = Math.round(stream.peakViewerCount * 0.65);

  sendSuccess(res, {
    analytics: {
      streamId: stream.id,
      title: stream.title,
      status: stream.status,
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
      duration: stream.duration || 0,
      peakConcurrentViewers: stream.peakViewerCount,
      averageConcurrentViewers: avgConcurrentViewers,
      uniqueViewers: Math.max(stream.viewerCount, stream.peakViewerCount),
      totalLiveViews: stream.viewerCount,
      replayViews: stream.replayViews,
      followersGained,
      chatMessageCount: chatCount,
      uniqueChatters: uniqueChattersAgg.length,
      totalGifts: giftCount,
      totalGiftPoints,
      creatorEarnings: totalGiftPoints,
      recordingStatus: stream.recordingStatus,
      publicationStatus: stream.publicationStatus,
      topSupporter: topSupporters[0] || null,
      topSupporters,
    },
  });
}));

// ─── GET /api/v1/streams/:id/supporters ──────────────────────

router.get('/:id/supporters', optionalAuth, asyncHandler(async (req, res) => {
  const scope = (req.query.scope as string) || 'stream';
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  const whereClause = scope === 'lifetime'
    ? { recipientId: stream.broadcasterId }
    : { streamId: stream.id };

  const supportersRaw = await prisma.giftTransaction.groupBy({
    by: ['senderId'],
    where: whereClause,
    _sum: { totalPrice: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 10,
  });

  const userIds = supportersRaw.map(s => s.senderId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const supporters = supportersRaw.map((s, index) => ({
    rank: index + 1,
    user: userMap.get(s.senderId),
    totalPoints: s._sum.totalPrice || 0,
  }));

  sendSuccess(res, { supporters });
}));

// ─── POST /api/v1/streams/:id/replay-view ────────────────────

router.post('/:id/replay-view', optionalAuth, asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findFirst({
    where: { OR: [{ id: req.params.id }, { publicId: req.params.id }] },
  });

  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.status === StreamStatus.ENDED && stream.recordingStatus === RecordingStatus.READY) {
    await prisma.stream.update({
      where: { id: stream.id },
      data: { replayViews: { increment: 1 } },
    });
  }

  sendSuccess(res, { success: true });
}));

export const streamsRouter = router;

