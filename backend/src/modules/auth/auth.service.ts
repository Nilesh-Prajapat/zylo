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

async function generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
  const cleanBase = baseUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, '') || 'user';

  const candidateTemplates = [
    `${cleanBase}${Math.floor(100 + Math.random() * 900)}`,
    `${cleanBase}_live`,
    `${cleanBase}_zylo`,
    `real_${cleanBase}`,
    `${cleanBase}_official`,
    `${cleanBase}${Math.floor(10 + Math.random() * 90)}`,
  ];

  const suggestions: string[] = [];
  for (const candidate of candidateTemplates) {
    if (suggestions.length >= 4) break;
    const exists = await authRepository.findUserByUsername(candidate);
    if (!exists && !suggestions.includes(candidate)) {
      suggestions.push(candidate);
    }
  }

  while (suggestions.length < 4) {
    const extra = `${cleanBase}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await authRepository.findUserByUsername(extra);
    if (!exists && !suggestions.includes(extra)) {
      suggestions.push(extra);
    }
  }

  return suggestions;
}

export const authService = {
  async register(input: RegisterInput) {
    // Check duplicate email
    const existingEmail = await authRepository.findUserByEmail(input.email);
    if (existingEmail) {
      throw new AppError(
        409,
        ErrorCodes.EMAIL_TAKEN,
        'This email address is already registered. Please log in or use a different email.'
      );
    }

    // Check duplicate username
    const existingUsername = await authRepository.findUserByUsername(input.username);
    if (existingUsername) {
      const suggestions = await generateUsernameSuggestions(input.username);
      throw new AppError(
        409,
        ErrorCodes.USERNAME_TAKEN,
        `Username "${input.username}" is already taken. Please choose another username or select a suggestion below.`,
        suggestions
      );
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

  async checkUsername(username: string) {
    if (!username || username.trim().length === 0) {
      return { available: false, suggestions: [] };
    }
    const existing = await authRepository.findUserByUsername(username.trim());
    if (existing) {
      const suggestions = await generateUsernameSuggestions(username);
      return { available: false, username, suggestions };
    }
    return { available: true, username, suggestions: [] };
  },
};

function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user as Record<string, unknown>;
  return safe;
}
