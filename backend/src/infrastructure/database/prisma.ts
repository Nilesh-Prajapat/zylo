import dns from 'dns';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/logger';

// Configure custom DNS resolvers (Google DNS 8.8.8.8 / 8.8.4.4 & Cloudflare 1.1.1.1)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed', { error: (err as Error).message });
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
