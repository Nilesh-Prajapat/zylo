'use client';

import Link from 'next/link';
import { Eye, Calendar, Play, MoreVertical, CheckCircle2 } from 'lucide-react';
import type { Stream } from '@/lib/types';
import { Avatar } from './Avatar';

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatScheduledDate(scheduledAt?: string | null): string {
  if (!scheduledAt) return 'Scheduled';
  const d = new Date(scheduledAt);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === 'LIVE';
  const isScheduled = stream.status === 'SCHEDULED';
  const viewerCount = stream.viewerCount || 0;
  const thumbnail = stream.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop';
  const broadcaster = stream.broadcaster;
  const displayName = broadcaster?.displayName || broadcaster?.username || 'Creator';
  const avatarUrl = broadcaster?.avatarUrl;
  const categoryName = stream.category?.name || stream.vibe || 'Live Stream';
  const isVerified = (broadcaster as any)?.verified ?? true;

  return (
    <Link href={`/stream/${stream.id}`} className="group flex flex-col min-w-0 select-none">
      {/* 16:9 Image Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-[#FAFAFC] border border-[#E9E5F2] shadow-xs transition duration-200 group-hover:shadow-md group-hover:border-[#7C3AED]/40">
        <img
          src={thumbnail}
          alt={stream.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Hover Watch Affordance */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top-left LIVE or UPCOMING badge */}
        {isLive && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-[#EF4444] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        )}

        {isScheduled && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-xs">
              <Calendar className="h-2.5 w-2.5" /> UPCOMING
            </span>
          </div>
        )}

        {/* Top-right Viewer Count */}
        {isLive && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-extrabold text-white backdrop-blur border border-white/10">
            <Eye className="h-3 w-3 text-white/90" />
            <span>{formatViewers(viewerCount)}</span>
          </div>
        )}

        {/* Bottom image overlay: Avatar & Name */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2 z-10">
          <Avatar src={avatarUrl} size="h-6 w-6" ring />
          <span className="truncate text-xs font-bold text-white drop-shadow flex items-center gap-1">
            {displayName}
            {isVerified && <CheckCircle2 className="h-3 w-3 text-[#7C3AED] fill-white" />}
          </span>
        </div>
      </div>

      {/* Creator Info Below Image */}
      <div className="mt-2.5 px-0.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-extrabold text-[#171322] leading-snug group-hover:text-[#7C3AED] transition">
            {stream.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block rounded-md bg-[#F3EEFF] px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
              {categoryName}
            </span>
            {isScheduled && (
              <span className="text-[10px] font-bold text-amber-600 truncate">
                {formatScheduledDate(stream.scheduledAt)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="rounded-full p-1 text-[#6F687D] hover:bg-[#F3EEFF] hover:text-[#7C3AED] transition cursor-pointer"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </Link>
  );
}
