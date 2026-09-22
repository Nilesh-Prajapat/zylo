import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/query-keys';
import {
  usersApi,
  walletApi,
  notificationsApi,
  streamsApi,
  followingFeedApi,
  streamAnalyticsApi,
  moderationApi,
} from '../api';

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => usersApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useWallet() {
  return useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: () => walletApi.getWallet(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications(unreadOnly),
    queryFn: () => notificationsApi.getNotifications(unreadOnly),
    staleTime: 15 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notificationUnreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 15 * 1000,
  });
}

export function useStream(streamId: string) {
  return useQuery({
    queryKey: queryKeys.stream(streamId),
    queryFn: () => streamsApi.getStreamById(streamId),
    enabled: !!streamId,
    staleTime: 15 * 1000,
  });
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => usersApi.getUserById(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFollowingFeed() {
  return useQuery({
    queryKey: queryKeys.followingFeed(),
    queryFn: () => followingFeedApi.getFeed(),
    staleTime: 60 * 1000,
  });
}

export function useCreatorStreams(params?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.creatorStreams(params),
    queryFn: () => streamsApi.getMyStreams(params),
    staleTime: 30 * 1000,
  });
}

export function useStreamAnalytics(streamId: string) {
  return useQuery({
    queryKey: queryKeys.streamAnalytics(streamId),
    queryFn: () => streamAnalyticsApi.getAnalytics(streamId),
    enabled: !!streamId,
    staleTime: 15 * 1000,
  });
}

export function useStreamSupporters(streamId: string, scope: 'stream' | 'lifetime' = 'stream') {
  return useQuery({
    queryKey: queryKeys.streamSupporters(streamId, scope),
    queryFn: () => streamAnalyticsApi.getSupporters(streamId, scope),
    enabled: !!streamId,
    staleTime: 15 * 1000,
  });
}

export function useStreamModeration(streamId: string) {
  return useQuery({
    queryKey: queryKeys.streamModeration(streamId),
    queryFn: () => moderationApi.getActiveRestrictions(streamId),
    enabled: !!streamId,
    staleTime: 15 * 1000,
  });
}
