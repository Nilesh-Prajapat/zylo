import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { streamsRouter } from '../modules/streams/streams.routes';
import { categoriesRouter } from '../modules/categories/categories.routes';
import { walletRouter, giftsRouter } from '../modules/wallet/wallet.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { reportsRouter } from '../modules/reports/reports.routes';
import { mediaRouter } from '../modules/media/media.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { webhooksRouter } from '../modules/webhooks/webhooks.routes';
import { moderationRouter } from '../modules/streams/moderation.routes';

const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zylo-backend',
    timestamp: new Date().toISOString(),
  });
});

// Module routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/streams', moderationRouter);
apiRouter.use('/streams', streamsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/gifts', giftsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/webhooks', webhooksRouter);

export { apiRouter };
