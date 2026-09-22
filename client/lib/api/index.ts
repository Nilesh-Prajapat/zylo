import { apiClient } from './axios-client';
import {
  Stream,
  UserProfile,
  ChatMessage,
  Gift,
  Wallet,
  WalletTransaction,
  CouponRedemption,
  Notification,
  UserRole,
  AdminUser,
  AdminStream,
  AdminReport,
} from '@/lib/types';

// ─── Auth ─────────────────────────────────────────────────────

export const authApi = {
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data.data;
  },

  async register(data: { email: string; password: string; username: string; displayName?: string }) {
    const res = await apiClient.post('/auth/register', {
      email: data.email,
      username: data.username,
      displayName: data.displayName || data.username,
      password: data.password,
    });
    return res.data.data;
  },

  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data.data;
  },

  async me(): Promise<UserProfile> {
    const res = await apiClient.get('/auth/me');
    return res.data.data.user;
  },

  async refresh() {
    const res = await apiClient.post('/auth/refresh');
    return res.data.data;
  },
};

// ─── Users ────────────────────────────────────────────────────

export const usersApi = {
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get('/users/me');
    return res.data.data.user;
  },

  async getUserById(id: string): Promise<{ user: UserProfile & { isFollowing?: boolean }; isFollowing?: boolean }> {
    const res = await apiClient.get(`/users/${id}`);
    const data = res.data.data;
    const isFollowing = Boolean(data.isFollowing ?? data.user?.isFollowing);
    return {
      user: { ...data.user, isFollowing },
      isFollowing,
    };
  },

  async updateProfile(data: { displayName?: string; bio?: string; avatarUrl?: string; coverImageUrl?: string }) {
    const res = await apiClient.put('/users/me', data);
    return res.data.data.user;
  },

  async switchRole(targetRole: UserRole): Promise<{ user: UserProfile; message: string }> {
    const res = await apiClient.post('/users/me/role/switch', { targetRole });
    return res.data.data;
  },

  async getTrendingCreators(): Promise<(UserProfile & { isFollowing?: boolean })[]> {
    const res = await apiClient.get('/users/trending');
    return res.data.data.creators || [];
  },

  async getFollowers(userId: string, cursor?: string): Promise<{ users: (UserProfile & { isFollowing?: boolean })[]; pagination: { hasMore: boolean; cursor?: string } }> {
    const res = await apiClient.get(`/users/${userId}/followers`, { params: { cursor } });
    return res.data.data;
  },

  async getFollowing(userId: string, cursor?: string): Promise<{ users: (UserProfile & { isFollowing?: boolean })[]; pagination: { hasMore: boolean; cursor?: string } }> {
    const res = await apiClient.get(`/users/${userId}/following`, { params: { cursor } });
    return res.data.data;
  },
};

// ─── Follows ──────────────────────────────────────────────────

export const followsApi = {
  async follow(userId: string) {
    const res = await apiClient.post(`/users/${userId}/follow`);
    return res.data.data;
  },

  async unfollow(userId: string) {
    const res = await apiClient.delete(`/users/${userId}/follow`);
    return res.data.data;
  },
};

// ─── Streams ──────────────────────────────────────────────────

export interface CreateStreamParams {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  language?: string;
  enableChat?: boolean;
  enableGifts?: boolean;
  saveRecording?: boolean;
  scheduledAt?: string;
}

export interface UpdateStreamParams {
  title?: string;
  description?: string;
  thumbnailUrl?: string | null;
  categoryId?: string | null;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  language?: string;
  enableChat?: boolean;
  enableGifts?: boolean;
  saveRecording?: boolean;
  publicationStatus?: 'PUBLISHED' | 'HIDDEN';
}

export const streamsApi = {
  async getLiveStreams(): Promise<Stream[]> {
    const res = await apiClient.get('/streams/live');
    return res.data.data?.streams || [];
  },

  async getUpcomingStreams(): Promise<Stream[]> {
    const res = await apiClient.get('/streams/upcoming');
    return res.data.data?.streams || [];
  },

  async getStreamById(id: string): Promise<{ stream: Stream; isFollowing?: boolean }> {
    const res = await apiClient.get(`/streams/${id}`);
    return res.data.data;
  },

  async createStream(params: CreateStreamParams) {
    const res = await apiClient.post('/streams', params);
    return res.data.data;
  },

  async endStream(streamId: string) {
    const res = await apiClient.post(`/streams/${streamId}/end`);
    return res.data.data;
  },

  async startStream(streamId: string) {
    const res = await apiClient.post(`/streams/${streamId}/start`);
    return res.data.data;
  },

  async getMyActiveStream(): Promise<Stream | null> {
    const res = await apiClient.get('/streams/mine/active');
    return res.data.data?.stream || null;
  },

  async getMyStreams(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    visibility?: string;
  }): Promise<{ items: Stream[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const res = await apiClient.get('/streams/mine', { params });
    const data = res.data.data;
    return {
      items: data?.items || data?.streams || [],
      pagination: data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  async getMyStats(): Promise<{ totalStreams: number; totalViews: number; followers: number; totalGifts: number }> {
    const res = await apiClient.get('/streams/mine/stats');
    return res.data.data;
  },

  async updateStream(streamId: string, data: UpdateStreamParams) {
    const res = await apiClient.patch(`/streams/${streamId}`, data);
    return res.data.data;
  },

  async updatePublication(streamId: string, publicationStatus: 'PUBLISHED' | 'HIDDEN') {
    const res = await apiClient.patch(`/streams/${streamId}/publication`, { publicationStatus });
    return res.data.data;
  },

  async cancelStream(streamId: string) {
    const res = await apiClient.post(`/streams/${streamId}/cancel`);
    return res.data.data;
  },

  async deleteStream(streamId: string) {
    const res = await apiClient.delete(`/streams/${streamId}`);
    return res.data.data;
  },

  async getStreamToken(streamId: string): Promise<{ token: string; livekitUrl: string; roomName?: string }> {
    const res = await apiClient.get(`/streams/${streamId}/token`);
    return res.data.data;
  },

  async getViewerToken(streamId: string): Promise<{ token: string; livekitUrl: string; roomName?: string }> {
    return this.getStreamToken(streamId);
  },

  async getChatHistory(streamId: string, limit?: number): Promise<ChatMessage[]> {
    const res = await apiClient.get(`/streams/${streamId}/chat`, { params: { limit: limit || 50 } });
    return res.data.data?.messages || [];
  },

  async getStreamChat(streamId: string, limit?: number): Promise<ChatMessage[]> {
    return this.getChatHistory(streamId, limit);
  },

  async updateStreamPublication(streamId: string, publicationStatus: 'PUBLISHED' | 'HIDDEN') {
    return this.updatePublication(streamId, publicationStatus);
  },
};

// ─── Wallet ───────────────────────────────────────────────────

export const walletApi = {
  async getWallet(): Promise<{ wallet: Wallet; userRole: UserRole; transactions: WalletTransaction[] }> {
    const res = await apiClient.get('/wallet');
    return res.data.data;
  },

  async getTransactions(params?: { type?: string; page?: number; pageSize?: number }): Promise<{ items: WalletTransaction[]; pagination: any }> {
    const res = await apiClient.get('/wallet/transactions', { params });
    return res.data.data;
  },

  async topUp(data: { amountCoins: number; amountUsd: number; paymentMethod?: string; idempotencyKey?: string }) {
    const res = await apiClient.post('/wallet/topup', data);
    return res.data.data;
  },

  async createTopupOrder(amountInr: number): Promise<{ orderId: string; amountInr: number; credits: number; currency: string; keyId: string; topupId: string }> {
    const res = await apiClient.post('/wallet/topup/order', { amountInr });
    return res.data.data;
  },

  async verifyTopup(data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; topup_id?: string }) {
    const res = await apiClient.post('/wallet/topup/verify', data);
    return res.data.data;
  },

  async redeem(data: { couponTitle: string; earningsDeducted: number; usdValue: number }) {
    const res = await apiClient.post('/wallet/redeem', data);
    return res.data.data;
  },

  async getRedemptions(): Promise<CouponRedemption[]> {
    const res = await apiClient.get('/wallet/redemptions');
    return res.data.data?.redemptions || [];
  },
};

// ─── Notifications ────────────────────────────────────────────

export const notificationsApi = {
  async getNotifications(unreadOnly?: boolean, limit?: number): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const res = await apiClient.get('/notifications', { params: { unreadOnly, limit } });
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data.data?.unreadCount || 0;
  },

  async markAsRead(id: string): Promise<Notification> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data.data?.notification;
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },
};

// ─── Gifts ────────────────────────────────────────────────────

export const giftApi = {
  async getGifts(): Promise<Gift[]> {
    const res = await apiClient.get('/gifts');
    return res.data.data?.gifts || [];
  },

  async sendGift(streamId: string, giftId: string, quantity: number = 1, balanceSource: 'PERSONAL_COINS' | 'CREATOR_EARNINGS' = 'PERSONAL_COINS') {
    const idempotencyKey = typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `gift-${Date.now()}-${Math.random()}`;
    const res = await apiClient.post(`/gifts/streams/${streamId}`, { giftId, quantity, idempotencyKey, balanceSource });
    return res.data.data;
  },
};

// ─── Moderation ───────────────────────────────────────────────

export const moderationApi = {
  async muteUser(streamId: string, data: { userId: string; durationMinutes: number; reason?: string }) {
    const res = await apiClient.post(`/streams/${streamId}/moderation/mute`, data);
    return res.data.data;
  },

  async banUser(streamId: string, data: { userId: string; durationMinutes?: number; permanent?: boolean; reason?: string }) {
    const res = await apiClient.post(`/streams/${streamId}/moderation/ban`, data);
    return res.data.data;
  },

  async unbanUser(streamId: string, userId: string) {
    const res = await apiClient.post(`/streams/${streamId}/moderation/unban`, { userId });
    return res.data.data;
  },

  async getActiveRestrictions(streamId: string) {
    const res = await apiClient.get(`/streams/${streamId}/moderation`);
    return res.data.data?.restrictions || [];
  },
};

// ─── Following & Analytics Extras ─────────────────────────────

export const followingFeedApi = {
  async getFeed() {
    const res = await apiClient.get('/streams/following/feed');
    return res.data.data;
  },
};

export const streamAnalyticsApi = {
  async getAnalytics(streamId: string) {
    const res = await apiClient.get(`/streams/${streamId}/analytics`);
    return res.data.data?.analytics;
  },

  async getSupporters(streamId: string, scope: 'stream' | 'lifetime' = 'stream') {
    const res = await apiClient.get(`/streams/${streamId}/supporters`, { params: { scope } });
    return res.data.data?.supporters || [];
  },

  async recordReplayView(streamId: string) {
    const res = await apiClient.post(`/streams/${streamId}/replay-view`);
    return res.data.data;
  },
};

// ─── Reports ──────────────────────────────────────────────────

export const reportsApi = {
  async createReport(data: { targetType: 'USER' | 'STREAM' | 'CHAT_MESSAGE'; targetId: string; reason: string }) {
    const res = await apiClient.post('/reports', data);
    return res.data.data;
  },
};

// ─── Admin ────────────────────────────────────────────────────

export const adminApi = {
  async getUsers(): Promise<AdminUser[]> {
    const res = await apiClient.get('/admin/users');
    return res.data.data?.users || [];
  },

  async getStreams(): Promise<AdminStream[]> {
    const res = await apiClient.get('/admin/streams');
    return res.data.data?.streams || [];
  },

  async getReports(): Promise<AdminReport[]> {
    const res = await apiClient.get('/admin/reports');
    return res.data.data?.reports || [];
  },

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  },

  async endStream(streamId: string) {
    const res = await apiClient.post(`/admin/streams/${streamId}/end`);
    return res.data.data;
  },

  async resolveReport(reportId: string, status: 'RESOLVED' | 'DISMISSED' | 'REVIEWED', adminNotes?: string) {
    const res = await apiClient.patch(`/admin/reports/${reportId}`, { status, adminNotes });
    return res.data.data;
  },

  async getDashboardStats() {
    const res = await apiClient.get('/admin/dashboard');
    return res.data.data;
  },
};

// ─── Media ────────────────────────────────────────────────────

export const mediaApi = {
  async uploadFile(file: File, assetType: string = 'STREAM_THUMBNAIL'): Promise<{ url: string; asset?: any }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetType', assetType);

    const res = await apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async getCloudinarySignature(assetType: string) {
    const res = await apiClient.post('/media/cloudinary/signature', { assetType });
    return res.data.data?.uploadParams;
  },

  async completeUpload(data: {
    providerPublicId: string;
    assetType: string;
    originalUrl: string;
    deliveryUrl: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }) {
    const res = await apiClient.post('/media/complete', data);
    return res.data.data?.asset;
  },
};
