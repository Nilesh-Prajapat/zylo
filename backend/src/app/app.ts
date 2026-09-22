import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
  rateLimitMiddleware,
  errorHandlerMiddleware,
} from '../common/middleware';
import { apiRouter } from './routes';
import { prisma } from '../infrastructure/database/prisma';
import { getRedis } from '../infrastructure/redis/redis';
import { swaggerSpec } from './swagger';

export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  const allowedOrigins = env.CORS_ORIGINS.split(',').map(s => s.trim());
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body and cookie parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request tracing & logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Global rate limiter
  app.use('/api', rateLimitMiddleware(100, 60 * 1000));

  // Health check (top-level, no auth required)
  app.get('/health', async (_req, res) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch { /* db check failed */ }

    try {
      const redis = getRedis();
      await redis.ping();
      redisStatus = 'connected';
    } catch { /* redis check failed */ }

    const status = dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'degraded';

    res.status(status === 'ok' ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      service: 'zylo-api',
      database: dbStatus,
      redis: redisStatus,
    });
  });

  // Swagger API docs
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Mount API routes
  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Centralized error handler
  app.use(errorHandlerMiddleware);

  return app;
}
