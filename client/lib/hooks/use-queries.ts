import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsApi, walletApi, giftApi, followsApi, usersApi, adminApi, CreateStreamParams, UpdateStreamParams } from '@/lib/api';
import { dedupeRequest } from '@/lib/api/cache-utils';
import { socketClient } from '@/lib/socket';
import type { Stream, Gift, ChatMessage, AdminUser, AdminStream, AdminReport } from '@/lib/types';


// ─── Query Keys ───────────────────────────────────────────────

export const queryKeys = {
  me: ['me'] as const,
  profile: (id: string) => ['profile', id] as const,
  liveStreams: ['liveStreams'] as const,
  upcomingStreams: ['upcomingStreams'] as const,
  trendingCreators: ['trending-creators'] as const,
  stream: (id: string) => ['stream', id] as const,
  streamChat: (id: string) => ['stream-chat', id] as const,
  creatorStreams: (filters?: Record<string, any>) => ['creator-streams', filters] as const,
  creatorStats: ['creator-stats'] as const,
  activeStream: ['active-stream'] as const,
  wallet: ['wallet'] as const,
  walletTransactions: ['wallet-transactions'] as const,
  gifts: ['gifts'] as const,
  notifications: ['notifications'] as const,
  adminUsers: ['admin-users'] as const,
  adminStreams: ['admin-streams'] as const,
  adminReports: ['admin-reports'] as const,
} as const;

// ─── Stream Queries ───────────────────────────────────────────

export function useLiveStreams() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socketClient.connect();

    const handleViewerCountUpdate = (payload: { streamId: string; viewerCount: number }) => {
      queryClient.setQueryData<Stream[]>(queryKeys.liveStreams, (oldStreams?: Stream[]) => {
        if (!oldStreams) return oldStreams;
        return oldStreams.map((s: Stream) =>
          s.id === payload.streamId ? { ...s, viewerCount: payload.viewerCount } : s
        );
      });
    };

    socketClient.on('stream:viewer_count', handleViewerCountUpdate);
    return () => {
      socketClient.off('stream:viewer_count', handleViewerCountUpdate);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.liveStreams,
    queryFn: () => dedupeRequest('live-streams', () => streamsApi.getLiveStreams()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrendingCreators() {
  return useQuery({
    queryKey: queryKeys.trendingCreators,
    queryFn: () => dedupeRequest('trending-creators', () => usersApi.getTrendingCreators()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcomingStreams() {
  return useQuery({
    queryKey: queryKeys.upcomingStreams,
    queryFn: () => streamsApi.getUpcomingStreams(),
    staleTime: 30 * 1000,
  });
}

export function useDiscoverStreams() {
  return useQuery({
    queryKey: ['discoverStreams'] as const,
    queryFn: () => streamsApi.getDiscoverStreams(),
    staleTime: 15 * 1000,
  });
}

export function useStream(id: string) {
  return useQuery({
    queryKey: queryKeys.stream(id),
    queryFn: () => streamsApi.getStreamById(id),
    enabled: !!id,
  });
}

export function useStreamChat(streamId: string) {
  return useQuery({
    queryKey: queryKeys.streamChat(streamId),
    queryFn: () => streamsApi.getChatHistory(streamId),
    enabled: !!streamId,
  });
}

export function useMyActiveStream() {
  return useQuery({
    queryKey: queryKeys.activeStream,
    queryFn: () => streamsApi.getMyActiveStream(),
    staleTime: 5 * 1000,
  });
}

export function useCreatorStreams(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  visibility?: string;
}) {
  const keyStr = JSON.stringify(params || {});
  return useQuery({
    queryKey: queryKeys.creatorStreams(params),
    queryFn: () => dedupeRequest(`creator-streams-${keyStr}`, () => streamsApi.getMyStreams(params)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatorStats() {
  return useQuery({
    queryKey: queryKeys.creatorStats,
    queryFn: () => dedupeRequest('creator-stats', () => streamsApi.getMyStats()),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Stream Mutations ─────────────────────────────────────────

export function useCreateStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateStreamParams) => streamsApi.createStream(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveStreams });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeStream });
      queryClient.invalidateQueries({ queryKey: ['creator-streams'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorStats });
    },
  });
}

export function useEndStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (streamId: string) => streamsApi.endStream(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveStreams });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeStream });
      queryClient.invalidateQueries({ queryKey: ['creator-streams'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorStats });
    },
  });
}

export function useUpdateStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ streamId, data }: { streamId: string; data: UpdateStreamParams }) =>
      streamsApi.updateStream(streamId, data),
    onSuccess: (_, { streamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stream(streamId) });
      queryClient.invalidateQueries({ queryKey: ['creator-streams'] });
    },
  });
}

export function useUpdatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ streamId, status }: { streamId: string; status: 'PUBLISHED' | 'HIDDEN' }) =>
      streamsApi.updatePublication(streamId, status),
    onSuccess: (_, { streamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stream(streamId) });
      queryClient.invalidateQueries({ queryKey: ['creator-streams'] });
    },
  });
}

export function useDeleteStream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (streamId: string) => streamsApi.deleteStream(streamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-streams'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorStats });
    },
  });
}

// ─── Follow Mutations ─────────────────────────────────────────

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followsApi.follow(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorStats });
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followsApi.unfollow(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorStats });
    },
  });
}

// ─── Wallet/Gift Queries ──────────────────────────────────────

export function useWallet() {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: () => walletApi.getWallet(),
  });
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: queryKeys.walletTransactions,
    queryFn: () => walletApi.getTransactions(),
  });
}

export function useGifts() {
  return useQuery({
    queryKey: queryKeys.gifts,
    queryFn: () => giftApi.getGifts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSendGift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ streamId, giftId, quantity }: { streamId: string; giftId: string; quantity?: number }) =>
      giftApi.sendGift(streamId, giftId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions });
    },
  });
}

// ─── Profile & Connections Queries ─────────────────────────────

export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => dedupeRequest(`profile-${userId}`, () => usersApi.getUserById(userId)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId] as const,
    queryFn: () => dedupeRequest(`followers-${userId}`, () => usersApi.getFollowers(userId)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ['following', userId] as const,
    queryFn: () => dedupeRequest(`following-${userId}`, () => usersApi.getFollowing(userId)),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// ─── Admin Queries ─────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: queryKeys.adminUsers,
    queryFn: () => dedupeRequest('admin-users', () => adminApi.getUsers()),
    staleTime: 15 * 1000,
  });
}

export function useAdminStreams() {
  return useQuery<AdminStream[]>({
    queryKey: queryKeys.adminStreams,
    queryFn: () => dedupeRequest('admin-streams', () => adminApi.getStreams()),
    staleTime: 15 * 1000,
  });
}

export function useAdminReports() {
  return useQuery<AdminReport[]>({
    queryKey: queryKeys.adminReports,
    queryFn: () => dedupeRequest('admin-reports', () => adminApi.getReports()),
    staleTime: 15 * 1000,
  });
}



