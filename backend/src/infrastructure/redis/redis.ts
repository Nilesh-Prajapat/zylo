import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../common/logger';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    const isTls = env.REDIS_URL.startsWith('rediss://');
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  const r = getRedis();
  if (r.status === 'ready') return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
    r.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });
    r.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    logger.info('Redis disconnected');
  }
}
