import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, requireRole, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { UserRole } from '@prisma/client';

import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../../infrastructure/redis/keys';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

// GET /api/v1/categories
router.get('/', asyncHandler(async (req, res) => {
  const redis = getRedis();
  const cached = await redis.get(RedisKeys.categoriesAll());

  if (cached) {
    sendSuccess(res, { categories: JSON.parse(cached) });
    return;
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { streams: true },
      },
    },
  });

  await redis.setex(RedisKeys.categoriesAll(), RedisTTL.CATEGORIES_CACHE, JSON.stringify(categories));

  sendSuccess(res, { categories });
}));

// GET /api/v1/categories/:slug
router.get('/:slug', asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: {
      streams: {
        where: { status: 'LIVE' },
        include: {
          broadcaster: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  sendSuccess(res, { category });
}));

// POST /api/v1/categories (ADMIN only)
router.post(
  '/',
  requireAuth,
  requireRole(UserRole.ADMIN),
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.create({
      data: req.body,
    });

    const redis = getRedis();
    await redis.del(RedisKeys.categoriesAll());

    sendSuccess(res, { category }, 201);
  })
);

export const categoriesRouter = router;
