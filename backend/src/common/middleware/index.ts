import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from '../errors';
import { env } from '../../config/env';
import { logger } from '../logger';
import { prisma } from '../../infrastructure/database/prisma';
import { UserRole } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
    }
  }
}

// ─── Request ID ───────────────────────────────────────────────

export const requestIdMiddleware: RequestHandler = (req, _res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  next();
};

// ─── Async Handler (wraps controller methods) ─────────────────

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ─── Zod Validation ───────────────────────────────────────────

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, _res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', details));
      } else {
        next(err);
      }
    }
  };
}

// ─── Auth Middleware ───────────────────────────────────────────

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    let payload: jwt.JwtPayload;

    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, 'Access token expired');
      }
      throw new AppError(401, ErrorCodes.TOKEN_INVALID, 'Invalid access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, ErrorCodes.ACCOUNT_SUSPENDED, 'Account is suspended');
    }

    if (user.status === 'BANNED') {
      throw new AppError(403, ErrorCodes.ACCOUNT_BANNED, 'Account is banned');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Optional Auth ────────────────────────────────────────────

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, status: true, avatarUrl: true,
        },
      });
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    } catch {
      // Token invalid/expired, proceed without auth
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Role Check ───────────────────────────────────────────────

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, ErrorCodes.INSUFFICIENT_ROLE, `Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

// ─── Active Account Check ─────────────────────────────────────

export const requireActiveAccount: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }
  if (req.user.status !== 'ACTIVE') {
    return next(AppError.forbidden('Account is not active'));
  }
  next();
};

// ─── Error Handler ────────────────────────────────────────────

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${requestId}] ${err.message}`, { code: err.code, stack: err.stack });
    } else {
      logger.warn(`[${requestId}] ${err.code}: ${err.message}`);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined,
        requestId,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error(`[${requestId}] Unhandled error:`, { message: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      requestId,
    },
  });
};

// ─── Success Response Helpers ─────────────────────────────────

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      requestId: req.requestId,
      ip: req.ip,
    });
  });
  next();
};

export const rateLimitMiddleware = (_limit = 100, _windowMs = 60000): RequestHandler => {
  return (_req, _res, next) => {
    next();
  };
};

export const errorHandlerMiddleware = errorHandler;

export function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  pagination: { total?: number; cursor?: string; hasMore: boolean }
): void {
  res.status(200).json({
    success: true,
    data,
    pagination,
  });
}

