import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../infrastructure/database/prisma';
import { getRedis } from '../infrastructure/redis/redis';
import { RedisKeys, RedisTTL } from '../infrastructure/redis/keys';
import { logger } from '../common/logger';
import { StreamStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

let io: Server;

export function getIO(): Server {
  return io;
}

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map(s => s.trim()),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        socket.userId = undefined;
        return next();
      }

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
      });

      if (user && user.status === 'ACTIVE') {
        socket.userId = user.id;
        socket.username = user.username;
        socket.displayName = user.displayName;
        socket.avatarUrl = user.avatarUrl;
      } else {
        socket.userId = undefined;
      }

      next();
    } catch (err) {
      socket.userId = undefined;
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Socket connected', { userId: socket.userId || 'guest', socketId: socket.id });

    // Set user online presence & join private user room
    const redis = getRedis();
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      redis.setex(RedisKeys.userPresence(socket.userId), RedisTTL.USER_PRESENCE, 'online');
    }

    // ─── stream:join ────────────────────────────────────────
    socket.on('stream:join', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        if (!streamId) return;

        const stream = await prisma.stream.findUnique({ where: { id: streamId } });
        if (!stream) return;

        const room = `stream:${streamId}`;
        socket.join(room);

        // Viewer identity: authenticated user ID or fallback guest socket ID
        const viewerId = socket.userId || `guest:${socket.id}`;
        const isBroadcaster = socket.userId === stream.broadcasterId;

        if (!isBroadcaster) {
          // Add to viewer set
          await redis.sadd(RedisKeys.streamViewers(streamId), viewerId);
          // Map socket to viewer identity
          await redis.hset(RedisKeys.streamConnections(streamId), socket.id, viewerId);
        }

        const viewerCount = await redis.scard(RedisKeys.streamViewers(streamId));

        // Track peak
        const currentPeak = parseInt(await redis.get(RedisKeys.streamPeakViewers(streamId)) || '0');
        if (viewerCount > currentPeak) {
          await redis.set(RedisKeys.streamPeakViewers(streamId), viewerCount.toString());
        }

        // Acknowledge join
        socket.emit('stream:joined', { streamId, viewerCount });

        // Broadcast updated count
        io.to(room).emit('stream:viewer_count', { streamId, viewerCount });
      } catch (err) {
        logger.error('stream:join error', { error: (err as Error).message });
      }
    });

    // ─── stream:leave ───────────────────────────────────────
    socket.on('stream:leave', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        if (!streamId || !socket.userId) return;

        await handleViewerLeave(socket, streamId);
      } catch (err) {
        logger.error('stream:leave error', { error: (err as Error).message });
      }
    });

    // ─── chat:send ──────────────────────────────────────────
    socket.on('chat:send', async (data: { streamId: string; message: string }) => {
      try {
        const { streamId, message } = data;
        if (!streamId || !socket.userId || !message) return;

        // Validate message
        const trimmed = message.trim();
        if (trimmed.length === 0 || trimmed.length > 500) return;

        // Rate limiting
        const rateLimitKey = RedisKeys.chatRate(socket.userId);
        const count = await redis.incr(rateLimitKey);
        if (count === 1) {
          await redis.expire(rateLimitKey, RedisTTL.CHAT_RATE_WINDOW);
        }
        if (count > RedisTTL.CHAT_RATE_MAX) {
          socket.emit('chat:error', { code: 'RATE_LIMITED', message: 'Too many messages' });
          return;
        }

        // Verify stream is live
        const stream = await prisma.stream.findUnique({ where: { id: streamId } });
        if (!stream || stream.status !== StreamStatus.LIVE) {
          socket.emit('chat:error', { code: 'STREAM_NOT_LIVE', message: 'Stream is not live' });
          return;
        }

        // Check active moderation restrictions
        const activeRestriction = await prisma.streamModeration.findFirst({
          where: {
            streamId,
            userId: socket.userId,
            revokedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });
        if (activeRestriction) {
          socket.emit('chat:error', {
            code: activeRestriction.type === 'MUTE' ? 'USER_MUTED' : 'USER_BANNED',
            message: `You are currently ${activeRestriction.type === 'MUTE' ? 'muted' : 'banned'} on this stream.`,
          });
          return;
        }

        // Calculate offset seconds relative to stream start time
        const streamOffsetSeconds = stream.startedAt
          ? Math.max(0, (Date.now() - new Date(stream.startedAt).getTime()) / 1000)
          : 0;

        // Persist message
        const chatMessage = await prisma.chatMessage.create({
          data: {
            streamId,
            userId: socket.userId,
            message: trimmed,
            streamOffsetSeconds,
          },
        });

        // Broadcast to room
        const room = `stream:${streamId}`;
        io.to(room).emit('chat:message', {
          id: chatMessage.id,
          streamId,
          user: {
            id: socket.userId,
            username: socket.username,
            displayName: socket.displayName,
            avatarUrl: socket.avatarUrl,
          },
          message: trimmed,
          streamOffsetSeconds,
          createdAt: chatMessage.createdAt.toISOString(),
        });
      } catch (err) {
        logger.error('chat:send error', { error: (err as Error).message });
      }
    });

    // ─── chat:delete ────────────────────────────────────────
    socket.on('chat:delete', async (data: { streamId: string; messageId: string }) => {
      try {
        const { streamId, messageId } = data;
        if (!streamId || !messageId || !socket.userId) return;

        const stream = await prisma.stream.findUnique({ where: { id: streamId } });
        if (!stream) return;

        // Verify authorized creator or admin
        const user = await prisma.user.findUnique({ where: { id: socket.userId } });
        if (stream.broadcasterId !== socket.userId && user?.role !== 'ADMIN') {
          socket.emit('chat:error', { code: 'UNAUTHORIZED', message: 'Not authorized to delete chat messages' });
          return;
        }

        // Delete from database
        await prisma.chatMessage.deleteMany({
          where: { id: messageId, streamId },
        });

        // Broadcast chat:deleted to room
        const room = `stream:${streamId}`;
        io.to(room).emit('chat:deleted', { streamId, messageId });
      } catch (err) {
        logger.error('chat:delete error', { error: (err as Error).message });
      }
    });

    // ─── Heartbeat for presence ─────────────────────────────
    socket.on('presence:heartbeat', async () => {
      if (socket.userId) {
        await redis.setex(RedisKeys.userPresence(socket.userId), RedisTTL.USER_PRESENCE, 'online');
      }
    });

    // ─── Disconnect cleanup ─────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        if (!socket.userId) return;

        // Find which streams this socket was watching
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('stream:')) {
            const streamId = room.replace('stream:', '');
            await handleViewerLeave(socket, streamId);
          }
        }

        logger.info('Socket disconnected', { userId: socket.userId, socketId: socket.id });
      } catch (err) {
        logger.error('disconnect cleanup error', { error: (err as Error).message });
      }
    });
  });

  return io;
}

async function handleViewerLeave(socket: AuthenticatedSocket, streamId: string) {
  const redis = getRedis();
  const room = `stream:${streamId}`;

  const viewerId = socket.userId || `guest:${socket.id}`;

  // Remove socket-to-user mapping
  await redis.hdel(RedisKeys.streamConnections(streamId), socket.id);

  // Check if user has other sockets in this stream
  const connections = await redis.hvals(RedisKeys.streamConnections(streamId));
  const userStillConnected = connections.includes(viewerId);

  if (!userStillConnected) {
    // Remove from viewer set only if no other sockets
    await redis.srem(RedisKeys.streamViewers(streamId), viewerId);
  }

  socket.leave(room);

  const viewerCount = await redis.scard(RedisKeys.streamViewers(streamId));
  io.to(room).emit('stream:viewer_count', { streamId, viewerCount });
}

// Utility to emit events from outside Socket.IO handlers
export function emitToStream(streamId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`stream:${streamId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
