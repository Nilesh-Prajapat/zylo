'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, UserX } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useFollowUser } from '@/hooks/use-follow';
import { UserProfile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';

export default function FollowingPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [users, setUsers] = useState<(UserProfile & { isFollowing?: boolean })[]>([]);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const followMutation = useFollowUser();

  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      setLoading(true);
      try {
        const [userData, followingData] = await Promise.all([
          usersApi.getUserById(userId),
          usersApi.getFollowing(userId),
        ]);
        setTargetUser(userData.user);
        setUsers(followingData.users);
      } catch (err) {
        console.error('Failed to load following list:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/profile/${userId}`}
          className="rounded-xl border border-zylo-border bg-white p-2 text-zylo-secondary hover:bg-zylo-warm transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-zylo-text">
            {targetUser?.displayName || targetUser?.username || 'User'}&apos;s Following
          </h1>
          <p className="text-xs text-zylo-muted">Accounts followed by this user</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-zylo-border bg-white p-12 text-center shadow-xs">
          <UserX className="mx-auto h-10 w-10 text-zylo-muted" />
          <h3 className="mt-3 text-sm font-bold text-zylo-text">Not following anyone yet</h3>
          <p className="mt-1 text-xs text-zylo-secondary">This account is not following any creators right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-zylo-border bg-white p-4 shadow-xs transition hover:border-zylo-purple/30"
            >
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                <Avatar src={user.avatarUrl} size="h-10 w-10" />
                <div>
                  <h4 className="text-xs font-bold text-zylo-text">{user.displayName || user.username}</h4>
                  <p className="text-[11px] text-zylo-muted">@{user.username}</p>
                </div>
              </Link>
              <button
                onClick={() =>
                  followMutation.mutate({
                    targetUserId: user.id,
                    isCurrentlyFollowing: !!user.isFollowing,
                  })
                }
                disabled={followMutation.isPending}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold shadow-xs transition disabled:opacity-50 ${
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
  );
}
