'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followsApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * Global follow/unfollow hook using React Query optimistic mutations.
 * Can be called with a default userId or dynamically per action.
 */
export function useFollowUser(defaultUserId?: string) {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: (targetId: string) => followsApi.follow(targetId),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(targetId) });
      queryClient.invalidateQueries({ queryKey: ['trending-creators'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.followingFeed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.followingCreators() });
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetId: string) => followsApi.unfollow(targetId),
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(targetId) });
      queryClient.invalidateQueries({ queryKey: ['trending-creators'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.followingFeed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.followingCreators() });
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });

  const toggleFollow = (targetIdOrIsFollowing?: string | boolean, isCurrentlyFollowing?: boolean) => {
    let targetId = defaultUserId;
    let followingState = false;

    if (typeof targetIdOrIsFollowing === 'string') {
      targetId = targetIdOrIsFollowing;
      followingState = !!isCurrentlyFollowing;
    } else if (typeof targetIdOrIsFollowing === 'boolean') {
      followingState = targetIdOrIsFollowing;
    }

    if (!targetId) return;

    if (followingState) {
      unfollowMutation.mutate(targetId);
    } else {
      followMutation.mutate(targetId);
    }
  };

  const mutate = ({ targetUserId, isCurrentlyFollowing }: { targetUserId: string; isCurrentlyFollowing: boolean }) => {
    toggleFollow(targetUserId, isCurrentlyFollowing);
  };

  return {
    toggleFollow,
    mutate,
    isPending: followMutation.isPending || unfollowMutation.isPending,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
    error: followMutation.error || unfollowMutation.error,
  };
}
