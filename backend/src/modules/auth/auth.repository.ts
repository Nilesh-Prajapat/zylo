import { prisma } from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';

export const authRepository = {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, wallet: true },
    });
  },

  async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  },

  async createUser(data: {
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        profile: {
          create: {},
        },
        wallet: {
          create: { purchasedCoins: 1000, creatorEarnings: 0 }, // starter coins for new users
        },
      },
      include: { profile: true, wallet: true },
    });
  },

  async storeRefreshToken(data: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  },

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
  },

  async findRefreshTokenFamily(family: string) {
    return prisma.refreshToken.findMany({
      where: { family },
      orderBy: { createdAt: 'desc' },
    });
  },

  async revokeRefreshToken(id: string, replacedByTokenId?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId },
    });
  },

  async revokeTokenFamily(family: string) {
    return prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
