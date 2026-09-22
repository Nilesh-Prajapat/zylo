import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Zylo API',
      version: '1.0.0',
      description: 'Zylo Live Streaming Platform API — Authentication, Users, Profiles, Follow, Streams, Chat, Gifts, Wallet, Admin, and Health endpoints.',
    },
    servers: [
      {
        url: env.APP_URL + '/api/v1',
        description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string', enum: ['NORMAL_USER', 'CREATOR', 'ADMIN'] },
            status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'BANNED'] },
            avatarUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Stream: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['SCHEDULED', 'LIVE', 'ENDED'] },
            viewerCount: { type: 'integer' },
            broadcasterId: { type: 'string' },
            thumbnailUrl: { type: 'string', nullable: true },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            endedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Gift: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            emoji: { type: 'string' },
            price: { type: 'integer' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            purchasedCoins: { type: 'integer' },
            creatorEarnings: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Returns service health including database and Redis status',
          responses: {
            '200': { description: 'Service is healthy' },
            '503': { description: 'Service is degraded' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'username', 'displayName'], properties: { email: { type: 'string' }, password: { type: 'string' }, username: { type: 'string' }, displayName: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'User registered' }, '400': { description: 'Validation error' }, '409': { description: 'Email/username taken' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
        },
      },
      '/auth/refresh': {
        post: { tags: ['Authentication'], summary: 'Refresh access token', responses: { '200': { description: 'New access token' }, '401': { description: 'Invalid refresh token' } } },
      },
      '/auth/logout': {
        post: { tags: ['Authentication'], summary: 'Logout', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Logged out' } } },
      },
      '/auth/me': {
        get: { tags: ['Authentication'], summary: 'Get current user', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Current user profile' }, '401': { description: 'Unauthorized' } } },
      },
      '/users/me': {
        get: { tags: ['Users'], summary: 'Get my profile', security: [{ BearerAuth: [] }], responses: { '200': { description: 'My profile with wallet and counts' } } },
        put: { tags: ['Users'], summary: 'Update my profile', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { displayName: { type: 'string' }, bio: { type: 'string' }, avatarUrl: { type: 'string' }, coverImageUrl: { type: 'string' } } } } } }, responses: { '200': { description: 'Profile updated' } } },
      },
      '/users/trending': {
        get: { tags: ['Users'], summary: 'Get trending creators (Explore)', description: 'Returns CREATOR-role users only, excludes the current user', responses: { '200': { description: 'List of trending creators' } } },
      },
      '/users/{id}': {
        get: { tags: ['Users'], summary: 'Get user by ID or username', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User profile' }, '404': { description: 'User not found' } } },
      },
      '/users/{id}/follow': {
        post: { tags: ['Follow'], summary: 'Follow a user', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': { description: 'Followed' }, '400': { description: 'Cannot follow self' }, '409': { description: 'Already following' } } },
        delete: { tags: ['Follow'], summary: 'Unfollow a user', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Unfollowed' }, '404': { description: 'Not following' } } },
      },
      '/users/{id}/followers': {
        get: { tags: ['Follow'], summary: 'Get followers of a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Followers list with isFollowing flag' } } },
      },
      '/users/{id}/following': {
        get: { tags: ['Follow'], summary: 'Get users followed by a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Following list with isFollowing flag' } } },
      },
      '/streams': {
        post: { tags: ['Streams'], summary: 'Create a stream (CREATOR only)', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, thumbnailUrl: { type: 'string' }, categoryId: { type: 'string' } } } } } }, responses: { '201': { description: 'Stream created in SCHEDULED status' }, '403': { description: 'Requires CREATOR role' } } },
      },
      '/streams/{id}/start': {
        post: { tags: ['Streams'], summary: 'Start a SCHEDULED stream (go LIVE)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Stream is now LIVE' }, '400': { description: 'Invalid transition' }, '403': { description: 'Not authorized' } } },
      },
      '/streams/{id}/end': {
        post: { tags: ['Streams'], summary: 'End a live stream', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Stream ended' } } },
      },
      '/streams/live': {
        get: { tags: ['Streams'], summary: 'Get live streams', responses: { '200': { description: 'List of live streams' } } },
      },
      '/gifts': {
        get: { tags: ['Gifts'], summary: 'Get gift catalog', responses: { '200': { description: 'List of available gifts' } } },
      },
      '/gifts/streams/{id}': {
        post: { tags: ['Gifts'], summary: 'Send a gift to a live stream', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['giftId', 'idempotencyKey'], properties: { giftId: { type: 'string' }, quantity: { type: 'integer', default: 1 }, idempotencyKey: { type: 'string' }, balanceSource: { type: 'string', enum: ['PERSONAL_COINS', 'CREATOR_EARNINGS'] } } } } } }, responses: { '201': { description: 'Gift sent' }, '400': { description: 'Insufficient balance or stream not live' } } },
      },
      '/wallet': {
        get: { tags: ['Wallet'], summary: 'Get wallet balance', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Wallet information' } } },
      },
      '/wallet/topup': {
        post: { tags: ['Wallet'], summary: 'Top up wallet', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amountCoins', 'amountUsd'], properties: { amountCoins: { type: 'integer' }, amountUsd: { type: 'number' } } } } } }, responses: { '201': { description: 'Top up successful' } } },
      },
      '/wallet/redeem': {
        post: { tags: ['Wallet'], summary: 'Redeem creator earnings', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['couponTitle', 'earningsDeducted', 'usdValue'], properties: { couponTitle: { type: 'string' }, earningsDeducted: { type: 'integer' }, usdValue: { type: 'number' } } } } } }, responses: { '201': { description: 'Redemption successful' } } },
      },
      '/notifications': {
        get: { tags: ['Notifications'], summary: 'Get notifications', security: [{ BearerAuth: [] }], responses: { '200': { description: 'List of notifications' } } },
      },
      '/admin/users': {
        get: { tags: ['Admin'], summary: 'List all users (ADMIN only)', security: [{ BearerAuth: [] }], responses: { '200': { description: 'User list' }, '403': { description: 'Requires ADMIN role' } } },
      },
    },
  },
  apis: [], // We define paths inline above
};

export const swaggerSpec = swaggerJsdoc(options);
