import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess } from '../../common/middleware';
import { AppError } from '../../common/errors';

const router = Router();

// GET /api/v1/notifications
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, read: false },
  });

  sendSuccess(res, { notifications, unreadCount });
}));

// GET /api/v1/notifications/unread-count
router.get('/unread-count', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const unreadCount = await prisma.notification.count({
    where: { userId, read: false },
  });

  sendSuccess(res, { unreadCount });
}));

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) throw AppError.notFound('Notification not found');
  if (notification.userId !== userId) {
    throw AppError.forbidden('Not authorized to modify this notification');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  sendSuccess(res, { notification: updated });
}));

// POST /api/v1/notifications/read-all
router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  sendSuccess(res, { message: 'All notifications marked as read' });
}));

export const notificationsRouter = router;
