'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { dedupeRequest } from '@/lib/api/cache-utils';
import { socketClient } from '@/lib/socket';
import { Notification } from '@/lib/types';
import { useAuth } from '@/lib/auth';

export const notificationQueryKeys = {
  list: (unreadOnly?: boolean, limit?: number) => ['notifications', { unreadOnly, limit }] as const,
  unreadCount: () => ['notification-unread-count'] as const,
};

export function useNotifications(unreadOnly?: boolean, limit?: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = notificationQueryKeys.list(unreadOnly, limit);
  const unreadCountKey = notificationQueryKeys.unreadCount();

  // Deduplicated notifications query with 5 min staleTime
  const notificationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      dedupeRequest(`notifications-${unreadOnly}-${limit}`, () =>
        notificationsApi.getNotifications(unreadOnly, limit)
      ),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Deduplicated unread count query
  const unreadCountQuery = useQuery({
    queryKey: unreadCountKey,
    queryFn: () => dedupeRequest('notifications-unread-count', () => notificationsApi.getUnreadCount()),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Socket event listener for real-time notifications
  useEffect(() => {
    if (!user) return;

    socketClient.connect();

    const handleNewNotification = (newNotif: Notification) => {
      // 1. Update notification list cache without duplicate IDs
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (oldData: any) => {
        if (!oldData) return { notifications: [newNotif], unreadCount: 1 };
        const existing: Notification[] = oldData.notifications || [];
        if (existing.some((n) => n.id === newNotif.id)) return oldData;
        return {
          ...oldData,
          notifications: [newNotif, ...existing],
          unreadCount: (oldData.unreadCount || 0) + 1,
        };
      });

      // 2. Increment unread count query
      queryClient.setQueryData(unreadCountKey, (old: number | undefined) => (old || 0) + 1);
    };

    socketClient.on('notification:new', handleNewNotification);

    return () => {
      socketClient.off('notification:new', handleNewNotification);
    };
  }, [user, queryClient, unreadCountKey]);

  // Optimistic Mark Read Mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Optimistically update list caches
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (oldData: any) => {
        if (!oldData || !oldData.notifications) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: Notification) =>
            n.id === id ? { ...n, read: true } : n
          ),
        };
      });

      // Optimistically decrement unread count
      queryClient.setQueryData(unreadCountKey, (old: number | undefined) =>
        Math.max(0, (old || 1) - 1)
      );
    },
  });

  // Optimistic Mark All Read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Optimistically mark all read in caches
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (oldData: any) => {
        if (!oldData || !oldData.notifications) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: Notification) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      });

      // Reset unread count to 0
      queryClient.setQueryData(unreadCountKey, 0);
    },
  });

  const markAsRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  const markAllAsRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  return {
    notifications: notificationsQuery.data?.notifications || [],
    unreadCount: unreadCountQuery.data ?? (notificationsQuery.data?.unreadCount || 0),
    isLoading: notificationsQuery.isLoading,
    isRefreshing: notificationsQuery.isFetching && !notificationsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    refetch: notificationsQuery.refetch,
  };
}
