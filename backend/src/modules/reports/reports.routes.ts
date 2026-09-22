import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate } from '../../common/middleware';

const router = Router();

const createReportSchema = z.object({
  targetType: z.enum(['USER', 'STREAM', 'CHAT_MESSAGE']),
  targetId: z.string().min(1),
  reason: z.string().min(10).max(1000),
});

// POST /api/v1/reports
router.post('/', requireAuth, validate(createReportSchema), asyncHandler(async (req, res) => {
  const { targetType, targetId, reason } = req.body;

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      targetType,
      targetId,
      reason,
    },
  });

  sendSuccess(res, { report }, 201);
}));

export const reportsRouter = router;
