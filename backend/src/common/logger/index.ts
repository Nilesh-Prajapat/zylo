import winston from 'winston';
import { env } from '../../config/env';

const sensitiveFields = [
  'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiSecret', 'apiKey', 'secretAccessKey',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
  'CLOUDINARY_API_SECRET', 'R2_SECRET_ACCESS_KEY',
  'MEDIAMTX_API_SECRET', 'authorization',
];

const redactSensitive = winston.format((info) => {
  if (typeof info.message === 'object' && info.message !== null) {
    info.message = redactObject(info.message as Record<string, unknown>);
  }
  return info;
});

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    redactSensitive(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
            const reqId = requestId ? ` [${requestId}]` : '';
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}${reqId}: ${typeof message === 'string' ? message : JSON.stringify(message)}${metaStr}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
  silent: env.NODE_ENV === 'test',
});
