import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../common/errors';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.validators';
import { logger } from '../../common/logger';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'zylo',
  });
}

function generateRefreshToken(): string {
  return uuidv4() + '-' + crypto.randomBytes(32).toString('hex');
}

export const authService = {
  async register(input: RegisterInput) {
    // Check duplicates
    const existingEmail = await authRepository.findUserByEmail(input.email);
    if (existingEmail) {
      throw new AppError(409, ErrorCodes.EMAIL_TAKEN, 'Email is already registered');
    }

    const existingUsername = await authRepository.findUserByUsername(input.username);
    if (existingUsername) {
      throw new AppError(409, ErrorCodes.USERNAME_TAKEN, 'Username is already taken');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await authRepository.createUser({
      email: input.email,
      username: input.username,
      displayName: input.displayName || input.username,
      passwordHash,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();
    const family = uuidv4();

    await authRepository.storeRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      family,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    logger.info('User registered', { userId: user.id, username: user.username });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async login(input: LoginInput) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (user.status === 'BANNED') {
      throw new AppError(403, ErrorCodes.ACCOUNT_BANNED, 'Account is banned');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, ErrorCodes.ACCOUNT_SUSPENDED, 'Account is suspended');
    }

    const validPassword = await argon2.verify(user.passwordHash, input.password);
    if (!validPassword) {
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();
    const family = uuidv4();

    await authRepository.storeRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      family,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    logger.info('User logged in', { userId: user.id });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async refresh(currentRefreshToken: string) {
    const tokenHash = hashToken(currentRefreshToken);
    const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      // Possible token reuse - check if this token was already used
      // If so, revoke entire family for security
      logger.warn('Refresh token not found or already revoked - possible reuse');
      throw new AppError(401, ErrorCodes.TOKEN_INVALID, 'Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await authRepository.revokeRefreshToken(storedToken.id);
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, 'Refresh token expired');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw new AppError(403, ErrorCodes.ACCOUNT_SUSPENDED, 'Account is not active');
    }

    // Rotate: revoke old, issue new
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);

    const newStoredToken = await authRepository.storeRefreshToken({
      userId: storedToken.userId,
      tokenHash: newTokenHash,
      family: storedToken.family,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await authRepository.revokeRefreshToken(storedToken.id, newStoredToken.id);

    const accessToken = generateAccessToken(storedToken.user.id, storedToken.user.role);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (storedToken) {
      // Revoke entire family
      await authRepository.revokeTokenFamily(storedToken.family);
      logger.info('User logged out', { userId: storedToken.userId });
    }
  },
};

function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user as Record<string, unknown>;
  return safe;
}
