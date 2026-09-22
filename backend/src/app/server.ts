import dns from 'dns';
import http from 'http';
import { createApp } from './app';
import { env } from '../config/env';
import { logger } from '../common/logger';
import { prisma } from '../infrastructure/database/prisma';
import { getRedis } from '../infrastructure/redis/redis';
import { setupSocketIO } from '../realtime/socket';

// Configure custom DNS resolvers (Google DNS 8.8.8.8 / 8.8.4.4 & Cloudflare 1.1.1.1)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

async function bootstrap() {
  try {
    logger.info('Starting Zylo Backend Service...', { env: env.NODE_ENV });

    // Initialize Express app
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = setupSocketIO(server);
    logger.info('Socket.IO realtime server initialized');

    // Test Redis connection
    const redis = getRedis();
    await redis.ping();
    logger.info('Redis connection established');

    // Start listening
    server.listen(env.PORT, () => {
      logger.info(`Zylo Backend running on port ${env.PORT} (${env.APP_URL})`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      try {
        server.close();
        await io.close();
        await prisma.$disconnect();
        await redis.quit();
        logger.info('Graceful shutdown completed');
      } catch (err) {
        logger.error('Error during shutdown', { error: (err as Error).message });
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

bootstrap();
