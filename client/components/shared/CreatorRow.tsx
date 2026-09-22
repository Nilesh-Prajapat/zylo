'use client';

import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { Avatar } from './Avatar';

function formatNumber(count?: number): string {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function CreatorRow({ creators }: { creators: UserProfile[] }) {
  return (
    <div className="scrollbar-hide flex gap-5 overflow-x-auto pb-1">
      {creators.map((creator) => {
        const name = creator.displayName || (creator as any).name || creator.username;
        const avatar = creator.avatarUrl || (creator as any).avatar;
        const followerCount = creator._count?.followers || (creator as any).followers || 0;

        return (
          <Link
            key={creator.id}
            href={`/profile/${creator.id}`}
            className="group flex min-w-[64px] flex-col items-center gap-1.5"
          >
            <div className="relative rounded-full border-2 border-zylo-border p-0.5 transition duration-200 group-hover:scale-105">
              <Avatar src={avatar} size="h-14 w-14" />
            </div>
            <span className="text-xs font-bold text-zylo-text">{name}</span>
            <span className="text-[10px] text-zylo-muted">{formatNumber(followerCount)} followers</span>
          </Link>
        );
      })}
    </div>
  );
}
