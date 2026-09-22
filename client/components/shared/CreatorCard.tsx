'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { Avatar } from './Avatar';
import { followsApi } from '@/lib/api';

export function FollowButton({
  creatorId,
  initialFollowing = false,
  compact = false,
}: {
  creatorId: string;
  initialFollowing?: boolean;
  compact?: boolean;
}) {
  const [followed, setFollowed] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggleFollow = async () => {
    try {
      setLoading(true);
      if (followed) {
        await followsApi.unfollow(creatorId);
        setFollowed(false);
      } else {
        await followsApi.follow(creatorId);
        setFollowed(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={toggleFollow}
      className={`rounded-xl font-bold transition-all disabled:opacity-50 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${
        followed
          ? 'bg-zylo-soft text-zylo-purple border border-zylo-purple/30'
          : 'bg-zylo-purple text-white hover:bg-[#6926d1]'
      }`}
    >
      {followed ? 'Following' : 'Follow'}
    </button>
  );
}

export function CreatorCard({ creator }: { creator: UserProfile & { isFollowing?: boolean } }) {
  const name = creator.displayName || creator.username;
  const avatar = creator.avatarUrl;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zylo-border bg-white p-3.5 transition hover:border-zylo-purple/30 shadow-xs">
      <Link href={`/profile/${creator.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar src={avatar} size="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-bold text-zylo-text group-hover:text-zylo-purple transition">{name}</p>
          </div>
          <p className="truncate text-xs text-zylo-muted">
            @{creator.username} {creator._count?.followers ? `· ${creator._count.followers} followers` : ''}
          </p>
        </div>
      </Link>
      <FollowButton creatorId={creator.id} initialFollowing={!!creator.isFollowing} compact />
    </div>
  );
}
