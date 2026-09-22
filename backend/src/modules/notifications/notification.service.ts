import { NotificationType } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { emitToUser } from '../../realtime/socket';
import { logger } from '../../common/logger';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });

    // Realtime Socket.IO emission to user's private socket room
    emitToUser(params.userId, 'notification:new', notification);

    return notification;
  } catch (err: any) {
    logger.error('Failed to create notification:', { error: err.message || err });
    return null;
  }
}
