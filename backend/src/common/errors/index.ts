export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }

  static rateLimited(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new AppError(429, code, message);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message, undefined, false);
  }
}

export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_REUSED: 'TOKEN_REUSED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',

  // Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  NOT_OWNER: 'NOT_OWNER',

  // Streams
  STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
  INVALID_STREAM_TRANSITION: 'INVALID_STREAM_TRANSITION',
  STREAM_NOT_LIVE: 'STREAM_NOT_LIVE',
  ALREADY_BROADCASTING: 'ALREADY_BROADCASTING',

  // Chat
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',

  // Wallet/Gifts
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  GIFT_NOT_FOUND: 'GIFT_NOT_FOUND',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  INVALID_QUANTITY: 'INVALID_QUANTITY',

  // Media
  INVALID_MEDIA_TYPE: 'INVALID_MEDIA_TYPE',
  MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
