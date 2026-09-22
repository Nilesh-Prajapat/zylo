'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Stream } from '@/lib/types';
import { Avatar } from './Avatar';

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === 'LIVE';
  const viewerCount = stream.viewerCount || 0;
  const thumbnail = stream.thumbnailUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop';
  const broadcaster = stream.broadcaster;
  const displayName = broadcaster?.displayName || broadcaster?.username || 'Creator';
  const avatarUrl = broadcaster?.avatarUrl;

  return (
    <Link href={`/stream/${stream.id}`} className="group block">
      <div className="relative aspect-[1.55/1] overflow-hidden rounded-2xl bg-zylo-soft border border-zylo-border/60 shadow-xs">
        <img
          src={thumbnail}
          alt={stream.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top-left Badges */}
        {isLive && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-[#ff426d] px-2 py-0.5 text-[10px] font-black text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              <Users className="h-2.5 w-2.5" /> {formatViewers(viewerCount)}
            </span>
          </div>
        )}

        {/* Bottom-left Creator Badge Overlay */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 backdrop-blur border border-white/20">
          <Avatar src={avatarUrl} size="h-5 w-5" />
          <span className="text-[11px] font-bold text-white drop-shadow-sm">
            {displayName}
          </span>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-xs font-extrabold text-zylo-text leading-snug">
          {stream.title}
        </h3>
      </div>
    </Link>
  );
}
