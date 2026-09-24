'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
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
      setFollowed(!followed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={toggleFollow}
      className={`rounded-full font-bold transition-all disabled:opacity-50 cursor-pointer select-none ${
        compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${
        followed
          ? 'bg-[#F3EEFF] text-[#7C3AED] border border-[#7C3AED]/30'
          : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
      }`}
    >
      {followed ? 'Following' : 'Follow'}
    </button>
  );
}

function formatFollowers(count?: number): string {
  if (!count) return '12.4K followers';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M followers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K followers`;
  return `${count} followers`;
}

export function CreatorCard({ creator }: { creator: UserProfile & { isFollowing?: boolean; verified?: boolean; followersCount?: number } }) {
  const name = creator.displayName || creator.username;
  const avatar = creator.avatarUrl;
  const followers = creator._count?.followers || (creator as any).followersCount || 15400;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#E9E5F2] bg-white p-3.5 transition hover:border-[#7C3AED]/30 hover:shadow-xs select-none">
      <Link href={`/profile/${creator.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar src={avatar} size="h-11 w-11" ring />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-xs sm:text-sm font-extrabold text-[#171322] group-hover:text-[#7C3AED] transition">
              {name}
            </p>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#7C3AED] shrink-0" />
          </div>
          <p className="truncate text-[11px] text-[#6F687D]">
            @{creator.username} · {formatFollowers(followers)}
          </p>
        </div>
      </Link>
      <FollowButton creatorId={creator.id} initialFollowing={!!creator.isFollowing} compact />
    </div>
  );
}
