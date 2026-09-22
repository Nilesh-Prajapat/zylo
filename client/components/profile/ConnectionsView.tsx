import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, UserX } from 'lucide-react';
import { useFollowUser } from '@/hooks/use-follow';
import { useProfile, useFollowers, useFollowing } from '@/lib/hooks/use-queries';
import { UserProfile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';

interface ConnectionsViewProps {
  initialTab?: 'followers' | 'following';
}

export function ConnectionsView({ initialTab = 'followers' }: ConnectionsViewProps) {
  const params = useParams();
  const userId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);

  // Caching with React Query - background fetching enabled, instant memory cache retrieval
  const { data: profileRes, isLoading: loadingProfile } = useProfile(userId);
  const { data: followersRes, isLoading: loadingFollowers } = useFollowers(userId);
  const { data: followingRes, isLoading: loadingFollowing } = useFollowing(userId);

  const followMutation = useFollowUser();

  // Keep track of optimistic follow states locally if needed
  const [localFollowState, setLocalFollowState] = useState<Record<string, boolean>>({});

  const targetUser = profileRes?.user;
  const followersList: (UserProfile & { isFollowing?: boolean })[] = followersRes?.users || [];
  const followingList: (UserProfile & { isFollowing?: boolean })[] = followingRes?.users || [];

  const currentRawList = activeTab === 'followers' ? followersList : followingList;
  const currentList = currentRawList.map((u) => ({
    ...u,
    isFollowing: localFollowState[u.id] !== undefined ? localFollowState[u.id] : u.isFollowing,
  }));

  const userName = targetUser?.displayName || targetUser?.username || 'User';
  const loading = loadingProfile || (activeTab === 'followers' ? loadingFollowers : loadingFollowing);

  const handleToggleFollow = (targetId: string, currentlyFollowing: boolean) => {
    setLocalFollowState((prev) => ({ ...prev, [targetId]: !currentlyFollowing }));
    followMutation.mutate({
      targetUserId: targetId,
      isCurrentlyFollowing: currentlyFollowing,
    });
  };

  const handleTabChange = (key: 'followers' | 'following') => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/profile/${userId}/${key}`);
    }
  };

  if (loading && !targetUser) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 lg:py-8 select-none">
        <div className="rounded-3xl border border-zylo-border bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-4 border-b border-zylo-border pb-6">
            <div className="h-10 w-10 rounded-xl bg-[#ECE8F5] animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded-md bg-[#ECE8F5] animate-pulse" />
              <div className="h-3 w-60 rounded-md bg-[#ECE8F5] animate-pulse" />
            </div>
          </div>
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 lg:py-8 select-none">
      <div className="rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden">
        {/* Header Card */}
        <div className="border-b border-zylo-border bg-zylo-warm/30 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/profile/${userId}`}
              className="rounded-xl border border-zylo-border bg-white p-2.5 text-zylo-secondary hover:bg-zylo-warm transition shadow-xs shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-zylo-text" />
            </Link>
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar src={targetUser?.avatarUrl} size="h-12 w-12" ring />
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold text-zylo-text truncate">
                  {userName}&apos;s Connections
                </h1>
                <p className="text-xs font-semibold text-zylo-muted truncate">
                  @{targetUser?.username} · {followersList.length} Followers · {followingList.length} Following
                </p>
              </div>
            </div>
          </div>

          {/* Segmented Tabs */}
          <div className="mt-6 flex border-b border-zylo-border">
            {[
              { key: 'followers', label: 'Followers', count: followersList.length },
              { key: 'following', label: 'Following', count: followingList.length },
            ].map(({ key, label, count }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTabChange(key as any)}
                  className={`relative flex items-center gap-2 px-6 py-3 text-xs font-black transition cursor-pointer border-b-2 ${
                    isActive
                      ? 'border-zylo-purple text-zylo-purple'
                      : 'border-transparent text-zylo-muted hover:text-zylo-text'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-zylo-soft text-zylo-purple' : 'bg-zylo-warm text-zylo-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User List Body */}
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zylo-purple" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zylo-border/60 bg-zylo-warm/30 p-12 text-center">
              <UserX className="h-10 w-10 text-zylo-muted mb-2" />
              <h3 className="text-sm font-extrabold text-zylo-text">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </h3>
              <p className="mt-1 text-xs font-medium text-zylo-muted max-w-sm">
                {activeTab === 'followers'
                  ? `${userName} does not have any followers right now.`
                  : `${userName} is not following any creators right now.`}
              </p>
              <Link
                href="/explore"
                className="mt-4 rounded-xl bg-zylo-purple px-4 py-2 text-xs font-extrabold text-white hover:bg-[#6926d1] transition shadow-xs"
              >
                Explore Creators
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zylo-border rounded-2xl border border-zylo-border bg-white shadow-2xs overflow-hidden">
              {currentList.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 transition hover:bg-zylo-warm/40"
                >
                  <Link href={`/profile/${user.id}`} className="flex items-center gap-3.5 min-w-0 flex-1">
                    <Avatar src={user.avatarUrl} size="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-zylo-text truncate">
                        {user.displayName || user.username}
                      </h4>
                      <p className="text-[11px] font-semibold text-zylo-muted truncate">@{user.username}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleToggleFollow(user.id, !!user.isFollowing)}
                    disabled={followMutation.isPending}
                    className={`rounded-xl px-4 py-2 text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                      user.isFollowing
                        ? 'border border-zylo-border bg-zylo-warm text-zylo-text hover:bg-zylo-soft'
                        : 'bg-zylo-purple text-white hover:bg-[#6926d1]'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : '+ Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
