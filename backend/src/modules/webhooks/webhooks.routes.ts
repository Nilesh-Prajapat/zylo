import { Router } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { StreamStatus, RecordingStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma';
import { env } from '../../config/env';
import { logger } from '../../common/logger';
import { createNotification } from '../notifications/notification.service';
import { getRedis } from '../../infrastructure/redis/redis';
import { RedisKeys } from '../../infrastructure/redis/keys';
import { getR2PublicUrl } from '../../infrastructure/storage/r2';

const router = Router();
const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

// POST /api/v1/webhooks/livekit
router.post('/livekit', async (req, res) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const authHeader = req.headers.authorization || '';

    let event: any = req.body;

    // Verify webhook if authorization header is provided
    if (authHeader) {
      try {
        event = await receiver.receive(rawBody, authHeader);
      } catch (err) {
        logger.warn('LiveKit webhook signature verification failed, falling back to body payload parsing');
      }
    }

    const { event: eventName, egressInfo, room } = event || {};

    if (eventName === 'egress_ended' || eventName === 'recording_complete' || (egressInfo && egressInfo.status === 'EGRESS_COMPLETE')) {
      const roomName = room?.name || egressInfo?.roomName;
      const fileResult = egressInfo?.fileResults?.[0] || egressInfo?.file;
      const filename = fileResult?.filename || egressInfo?.filename || `recordings/${roomName}.mp4`;
      const duration = egressInfo?.duration ? egressInfo.duration / 1000000000 : undefined;

      logger.info('LiveKit recording egress completed', { roomName, filename, duration });

      // Find stream by room name or publicId
      const stream = await prisma.stream.findFirst({
        where: {
          OR: [
            { livekitRoomName: roomName },
            { publicId: roomName?.replace('zylo-room-', '') },
          ],
        },
      });

      if (stream) {
        const replayUrl = getR2PublicUrl(filename);

        const updatedStream = await prisma.stream.update({
          where: { id: stream.id },
          data: {
            recordingStatus: RecordingStatus.READY,
            recordingStorageKey: filename,
            replayUrl,
            duration: duration || stream.duration,
            recordingFinalizedAt: new Date(),
          },
        });

        // Clear redis caches
        const redis = getRedis();
        await redis.del(RedisKeys.streamCache(stream.id));

        // Create REPLAY_READY notification for broadcaster
        await createNotification({
          userId: stream.broadcasterId,
          type: 'REPLAY_READY',
          title: 'Stream Replay Ready',
          message: `Your recording for "${stream.title}" has finished processing and is ready for replay.`,
          entityType: 'STREAM',
          entityId: stream.id,
        });

        logger.info('Stream recording status updated to READY', { streamId: stream.id, replayUrl });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.error('Error handling LiveKit webhook:', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export const webhooksRouter = router;
