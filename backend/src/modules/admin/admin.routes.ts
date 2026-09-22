import { Router } from 'express';
import { z } from 'zod';
import { UserRole, StreamStatus, ReportStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, requireRole, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { AppError } from '../../common/errors';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys } from '../../infrastructure/redis/keys';

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole(UserRole.ADMIN));

// ─── GET /api/v1/admin/users ──────────────────────────────────

router.get('/users', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const cursor = req.query.cursor as string | undefined;
  const status = req.query.status as string | undefined;
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, username: true, displayName: true,
      role: true, status: true, avatarUrl: true, createdAt: true,
      _count: { select: { reports: true, streams: true } },
    },
  });

  const hasMore = users.length > limit;
  const items = hasMore ? users.slice(0, limit) : users;

  sendSuccess(res, {
    users: items,
    pagination: { hasMore, cursor: hasMore ? items[items.length - 1].id : undefined },
  });
}));

// ─── PATCH /api/v1/admin/users/:id/status ─────────────────────

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
});

router.patch('/users/:id/status', validate(updateUserStatusSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');

  // Cannot change own status
  if (user.id === req.user!.id) {
    throw AppError.badRequest('Cannot change your own status');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true, username: true, displayName: true, role: true, status: true,
    },
  });

  // Invalidate cache
  const redis = getRedis();
  await redis.del(RedisKeys.profileCache(id));

  sendSuccess(res, { user: updated });
}));

// ─── GET /api/v1/admin/streams ────────────────────────────────

router.get('/streams', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const status = req.query.status as StreamStatus | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const streams = await prisma.stream.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      broadcaster: {
        select: { id: true, username: true, displayName: true },
      },
      _count: { select: { chatMessages: true, giftTransactions: true } },
    },
  });

  sendSuccess(res, { streams });
}));

// ─── POST /api/v1/admin/streams/:id/end ───────────────────────

router.post('/streams/:id/end', asyncHandler(async (req, res) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream) throw AppError.notFound('Stream not found');

  if (stream.status === StreamStatus.ENDED) {
    throw AppError.badRequest('Stream is already ended');
  }

  const updated = await prisma.stream.update({
    where: { id: stream.id },
    data: {
      status: StreamStatus.ENDED,
      endedAt: new Date(),
    },
  });

  const redis = getRedis();
  await redis.del(RedisKeys.liveStreams());
  await redis.del(RedisKeys.streamViewers(stream.id));

  sendSuccess(res, { stream: updated });
}));

// ─── GET /api/v1/admin/reports ────────────────────────────────

router.get('/reports', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const status = req.query.status as ReportStatus | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const reports = await prisma.report.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, username: true, displayName: true },
      },
      resolvedBy: {
        select: { id: true, username: true, displayName: true },
      },
    },
  });

  sendSuccess(res, { reports });
}));

// ─── PATCH /api/v1/admin/reports/:id ──────────────────────────

const updateReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().max(2000).optional(),
});

router.patch('/reports/:id', validate(updateReportSchema), asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw AppError.notFound('Report not found');

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: req.body.status,
      adminNotes: req.body.adminNotes,
      resolvedById: req.user!.id,
    },
  });

  sendSuccess(res, { report: updated });
}));

export const adminRouter = router;
