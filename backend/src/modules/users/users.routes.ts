import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate, optionalAuth } from '../../common/middleware';
import { AppError, ErrorCodes } from '../../common/errors';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../../infrastructure/redis/keys';
import { createNotification } from '../notifications/notification.service';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional(),
  website: z.string().url().max(200).optional().nullable(),
});

const switchRoleSchema = z.object({
  targetRole: z.enum(['NORMAL_USER', 'CREATOR']),  // ADMIN is never allowed here
});

// GET /api/v1/users/me
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, username: true, displayName: true,
      role: true, status: true, avatarUrl: true, createdAt: true,
      profile: true,
      wallet: { select: { purchasedCoins: true, creatorEarnings: true } },
      _count: { select: { followers: true, following: true, streams: true } },
    },
  });

  sendSuccess(res, { user });
}));

// POST /api/v1/users/me/role/switch
router.post('/me/role/switch', requireAuth, validate(switchRoleSchema), asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  const userId = req.user!.id;

  // Never allow switching to ADMIN via API
  if ((targetRole as string) === 'ADMIN') {
    throw AppError.forbidden('Cannot switch to ADMIN role');
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) throw AppError.notFound('User not found');

  if (currentUser.role === targetRole) {
    sendSuccess(res, { user: currentUser, message: 'Already in target role' });
    return;
  }

  // Prevent switching from CREATOR to NORMAL_USER if creator has an active live stream
  if (currentUser.role === 'CREATOR' && targetRole === 'NORMAL_USER') {
    const activeStream = await prisma.stream.findFirst({
      where: { broadcasterId: userId, status: 'LIVE' },
    });
    if (activeStream) {
      throw AppError.badRequest('You are currently live. End your live stream before switching back to Normal User.');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: targetRole },
    select: {
      id: true, email: true, username: true, displayName: true,
      role: true, status: true, avatarUrl: true, createdAt: true,
      profile: true,
      wallet: { select: { purchasedCoins: true, creatorEarnings: true } },
    },
  });

  const redis = getRedis();
  await redis.del(RedisKeys.profileCache(userId));

  sendSuccess(res, { user: updatedUser, message: `Role successfully switched to ${targetRole}` });
}));

// GET /api/v1/users/trending
router.get('/trending', optionalAuth, asyncHandler(async (req, res) => {
  const creators = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: 'CREATOR',
      // Exclude the currently logged-in user from Explore
      ...(req.user && { id: { not: req.user.id } }),
    },
    take: 20,
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      status: true,
      profile: true,
      _count: { select: { followers: true, following: true, streams: true } },
    },
    orderBy: [
      { followers: { _count: 'desc' } },
      { createdAt: 'desc' },
    ],
  });

  // Add follow status for each creator if authenticated
  let enrichedCreators = creators;
  if (req.user) {
    const followRecords = await prisma.follow.findMany({
      where: {
        followerId: req.user.id,
        followingId: { in: creators.map(c => c.id) },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(followRecords.map(f => f.followingId));
    enrichedCreators = creators.map(c => ({ ...c, isFollowing: followingSet.has(c.id) })) as any;
  }

  sendSuccess(res, { creators: enrichedCreators });
}));

// GET /api/v1/users/:id
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const redis = getRedis();
  const cached = await redis.get(RedisKeys.profileCache(id));
  if (cached) {
    const data = JSON.parse(cached);
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: data.id } },
      });
      isFollowing = !!follow;
    }
    sendSuccess(res, { user: { ...data, isFollowing }, isFollowing });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id }, { username: id.toLowerCase() }],
    },
    select: {
      id: true, username: true, displayName: true,
      role: true, avatarUrl: true, createdAt: true, status: true,
      profile: true,
      _count: { select: { followers: true, following: true, streams: true } },
    },
  });

  if (!user || user.status === 'BANNED') {
    throw AppError.notFound('User not found');
  }

  // Cache profile
  await redis.setex(RedisKeys.profileCache(user.id), RedisTTL.PROFILE_CACHE, JSON.stringify(user));

  let isFollowing = false;
  if (req.user) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  sendSuccess(res, { user: { ...user, isFollowing }, isFollowing });
}));

// PATCH & PUT /api/v1/users/me
const handleUpdateProfile = asyncHandler(async (req, res) => {
  const { displayName, bio, avatarUrl, coverImageUrl, location, website } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(displayName && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      profile: {
        update: {
          ...(bio !== undefined && { bio }),
          ...(coverImageUrl !== undefined && { coverImageUrl }),
          ...(location !== undefined && { location }),
          ...(website !== undefined && { website }),
        },
      },
    },
    select: {
      id: true, email: true, username: true, displayName: true,
      role: true, avatarUrl: true, profile: true,
    },
  });

  // Invalidate cache
  const redis = getRedis();
  await redis.del(RedisKeys.profileCache(req.user!.id));

  sendSuccess(res, { user: updatedUser });
});

router.patch('/me', requireAuth, validate(updateProfileSchema), handleUpdateProfile);
router.put('/me', requireAuth, validate(updateProfileSchema), handleUpdateProfile);

// POST /api/v1/users/:id/follow
router.post('/:id/follow', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user!.id;

  if (targetId === currentUserId) {
    throw AppError.badRequest('Cannot follow yourself');
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.status === 'BANNED') {
    throw AppError.notFound('User not found');
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } },
  });

  if (existing) {
    throw AppError.conflict('Already following this user');
  }

  await prisma.follow.create({
    data: { followerId: currentUserId, followingId: targetId },
  });

  // Create notification
  await createNotification({
    userId: targetId,
    type: 'FOLLOW',
    title: 'New Follower!',
    message: `@${req.user!.username} started following you`,
    entityType: 'USER',
    entityId: currentUserId,
  });

  // Invalidate caches
  const redis = getRedis();
  await redis.del(RedisKeys.profileCache(targetId));
  await redis.del(RedisKeys.profileCache(currentUserId));

  sendSuccess(res, { following: true }, 201);
}));

// DELETE /api/v1/users/:id/follow
router.delete('/:id/follow', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const currentUserId = req.user!.id;

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } },
  });

  if (!existing) {
    throw AppError.notFound('Not following this user');
  }

  await prisma.follow.delete({
    where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } },
  });

  // Invalidate caches
  const redis = getRedis();
  await redis.del(RedisKeys.profileCache(targetId));
  await redis.del(RedisKeys.profileCache(currentUserId));

  sendSuccess(res, { following: false });
}));

// GET /api/v1/users/:id/followers
router.get('/:id/followers', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const followers = await prisma.follow.findMany({
    where: { followingId: id },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  const hasMore = followers.length > limit;
  const items = hasMore ? followers.slice(0, limit) : followers;

  // Enrich with follow status if authenticated
  let users = items.map(f => f.follower);
  if (req.user) {
    const followRecords = await prisma.follow.findMany({
      where: {
        followerId: req.user.id,
        followingId: { in: users.map(u => u.id) },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(followRecords.map(f => f.followingId));
    users = users.map(u => ({ ...u, isFollowing: followingSet.has(u.id) })) as any;
  }

  sendSuccess(res, {
    users,
    pagination: {
      hasMore,
      cursor: hasMore ? items[items.length - 1].id : undefined,
    },
  });
}));

// GET /api/v1/users/:id/following
router.get('/:id/following', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const following = await prisma.follow.findMany({
    where: { followerId: id },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
  });

  const hasMore = following.length > limit;
  const items = hasMore ? following.slice(0, limit) : following;

  // Enrich with follow status if authenticated
  let users = items.map(f => f.following);
  if (req.user) {
    const followRecords = await prisma.follow.findMany({
      where: {
        followerId: req.user.id,
        followingId: { in: users.map(u => u.id) },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(followRecords.map(f => f.followingId));
    users = users.map(u => ({ ...u, isFollowing: followingSet.has(u.id) })) as any;
  }

  sendSuccess(res, {
    users,
    pagination: {
      hasMore,
      cursor: hasMore ? items[items.length - 1].id : undefined,
    },
  });
}));

export const usersRouter = router;
