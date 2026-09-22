import request from 'supertest';
import { createApp } from '../app/app';

// Increase Jest timeout for Argon2 password hashing & DB operations
jest.setTimeout(30000);

const app = createApp();

describe('Zylo Core API & Security Test Suite', () => {
  let authToken = '';
  let creatorToken = '';
  let testUserId = '';
  let creatorUserId = '';
  let createdStreamId = '';

  describe('1. Health Check Endpoint', () => {
    it('GET /health returns service status', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('service', 'zylo-api');
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('redis');
    });
  });

  describe('2. Swagger API Documentation', () => {
    it('GET /api/v1/docs/ should serve Swagger UI', async () => {
      const res = await request(app).get('/api/v1/docs/');
      expect([200, 301, 302]).toContain(res.status);
    });
  });

  describe('3. Auth & User Registration', () => {
    it('POST /api/v1/auth/register creates a normal user', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `testuser_${timestamp}@zylo.test`,
          username: `testuser_${timestamp}`,
          password: 'Password123!',
          displayName: 'Test Normal User',
        });

      expect(res.status).toBe(201);
      const token = res.body.data.accessToken || res.body.data.token;
      expect(token).toBeDefined();
      expect(res.body.data.user).toHaveProperty('id');
      authToken = token;
      testUserId = res.body.data.user.id;
    });

    it('POST /api/v1/auth/register creates a creator user', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `creator_${timestamp}@zylo.test`,
          username: `creator_${timestamp}`,
          password: 'Password123!',
          displayName: 'Test Creator User',
        });

      expect(res.status).toBe(201);
      const token = res.body.data.accessToken || res.body.data.token;
      expect(token).toBeDefined();
      creatorToken = token;
      creatorUserId = res.body.data.user.id;

      // Switch role to CREATOR
      const switchRes = await request(app)
        .post('/api/v1/users/me/role/switch')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ targetRole: 'CREATOR' });

      expect(switchRes.status).toBe(200);
      expect(switchRes.body.data.user.role).toBe('CREATOR');
    });
  });

  describe('4. RBAC Guards & Role Switch Security', () => {
    it('POST /api/v1/users/me/role/switch rejects switching to ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/role/switch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetRole: 'ADMIN' });

      expect([400, 403]).toContain(res.status);
    });

    it('POST /api/v1/streams rejects normal users from creating streams (CREATOR only)', async () => {
      const res = await request(app)
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Unauthorized Stream Attempt',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Stream Lifecycle & Scheduled Start Flow', () => {
    it('POST /api/v1/streams creates stream in SCHEDULED status for CREATOR', async () => {
      const res = await request(app)
        .post('/api/v1/streams')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Official Integration Test Stream',
          description: 'Testing stream start flow',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.stream.status).toBe('SCHEDULED');
      createdStreamId = res.body.data.stream.id;
    });

    it('POST /api/v1/streams/:id/start transitions SCHEDULED to LIVE', async () => {
      const res = await request(app)
        .post(`/api/v1/streams/${createdStreamId}/start`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stream.status).toBe('LIVE');
    });

    it('GET /api/v1/streams/:id returns live stream info with broadcaster', async () => {
      const res = await request(app)
        .get(`/api/v1/streams/${createdStreamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stream.id).toBe(createdStreamId);
    });
  });

  describe('6. Follow & Unfollow System Integrity', () => {
    it('POST /api/v1/users/:id/follow allows following creator', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${creatorUserId}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.following).toBe(true);
    });

    it('POST /api/v1/users/:id/follow rejects duplicate follow (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${creatorUserId}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/users/:id/follow rejects self-follow', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${testUserId}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(res.status);
    });

    it('DELETE /api/v1/users/:id/follow unfollows target user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${creatorUserId}/follow`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.following).toBe(false);
    });
  });

  describe('7. Explore Creator Discovery', () => {
    it('GET /api/v1/users/trending returns active creators only', async () => {
      const res = await request(app)
        .get('/api/v1/users/trending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.creators)).toBe(true);
      // Ensure normal users are excluded
      const hasNormalUser = res.body.data.creators.some((c: any) => c.role !== 'CREATOR');
      expect(hasNormalUser).toBe(false);
    });
  });

  describe('8. Stream Cleanup', () => {
    it('POST /api/v1/streams/:id/end ends active stream', async () => {
      const res = await request(app)
        .post(`/api/v1/streams/${createdStreamId}/end`)
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stream.status).toBe('ENDED');
    });
  });
});
