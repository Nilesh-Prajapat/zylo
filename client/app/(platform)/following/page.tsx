'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, Compass } from 'lucide-react';
import { useFollowingFeed } from '@/lib/hooks/useData';
import { StreamCard } from '@/components/shared/StreamCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Avatar } from '@/components/shared/Avatar';

/* ── Shimmer Skeletons ── */
function CreatorRailSkeleton() {
  return (
    <div className="flex items-center gap-4 overflow-hidden pb-3 pt-1">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
          <div className="h-14 w-14 rounded-full bg-[#ECE8F5]" />
          <div className="h-2.5 w-12 rounded bg-[#ECE8F5]" />
        </div>
      ))}
    </div>
  );
}

function StreamGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video w-full rounded-lg bg-[#ECE8F5]" />
          <div className="mt-2 h-3 w-3/4 rounded bg-[#ECE8F5]" />
          <div className="mt-1.5 h-2.5 w-1/2 rounded bg-[#ECE8F5]" />
        </div>
      ))}
    </div>
  );
}

export default function FollowingPage() {
  const { data, isLoading, error } = useFollowingFeed();

  const creators = data?.creators || [];
  const liveStreams = data?.liveStreams || [];
  const recentlyPublished = data?.recentlyPublished || [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 select-none">
      {/* Editorial Clean Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text sm:text-4xl">
          Following
        </h1>
        <p className="mt-1.5 text-sm font-medium text-zylo-secondary">
          Live streams and recent activity from creators you follow.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-200">
          Failed to load following feed.
        </div>
      )}

      {/* Creator Story Rail Section */}
      <div className="mb-8">
        {isLoading ? (
          <CreatorRailSkeleton />
        ) : creators.length > 0 ? (
          <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
            {creators.map((creator: any) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.id}`}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative p-0.5 rounded-full border-2 border-zylo-purple/30 group-hover:border-zylo-purple transition">
                  <Avatar src={creator.avatarUrl} size="h-12 w-12 sm:h-14 sm:w-14" />
                  {creator.isLive ? (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-zylo-lime px-2 py-0.2 text-[9px] font-black uppercase text-black border border-white shadow-xs">
                      LIVE
                    </span>
                  ) : (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gray-100 px-1.5 py-0.2 text-[8px] font-bold text-gray-400 border border-white">
                      OFFLINE
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-zylo-text truncate max-w-[72px]">
                  {creator.displayName || creator.username}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Live Now Priority Section */}
      {(isLoading || liveStreams.length > 0) && (
        <section className="mb-10">
          <SectionHeader
            title="Live Now"
            subtitle="Followed creators currently streaming live"
          />
          {isLoading ? (
            <StreamGridSkeleton count={4} />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {liveStreams.map((stream: any) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recently Published Section */}
      {(isLoading || recentlyPublished.length > 0) && (
        <section className="mb-10">
          <SectionHeader
            title="Recently Published"
            subtitle="Replays and videos from creators you follow"
          />
          {isLoading ? (
            <StreamGridSkeleton count={4} />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recentlyPublished.map((stream: any) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Followed Creators Offline Empty State */}
      {!isLoading && creators.length > 0 && liveStreams.length === 0 && recentlyPublished.length === 0 && (
        <div className="my-8 flex flex-col items-center justify-center rounded-3xl border border-zylo-border bg-white p-10 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zylo-warm text-zylo-muted mb-3 border border-zylo-border">
            <Radio className="h-7 w-7 text-zylo-muted" />
          </div>
          <h3 className="text-lg font-extrabold text-zylo-text">None of your followed creators are live right now</h3>
          <p className="mt-1.5 text-xs text-zylo-secondary max-w-sm leading-relaxed">
            Your followed creators are currently offline. Check out the Explore page to discover live streams happening right now!
          </p>
          <Link
            href="/explore"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-zylo-purple-hover shadow-xs"
          >
            <Compass className="h-4 w-4" /> Explore Live Streams
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && creators.length === 0 && (
        <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zylo-border bg-white p-12 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zylo-soft text-zylo-purple mb-4">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-extrabold text-zylo-text">Not following any creators yet</h3>
          <p className="mt-2 text-sm text-zylo-secondary max-w-md">
            Discover creators on Explore to see their live streams and replays here.
          </p>
          <Link
            href="/explore"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zylo-purple px-5 py-3 text-xs font-extrabold text-white transition hover:bg-zylo-purple-hover shadow-xs"
          >
            <Compass className="h-4 w-4" /> Explore Creators
          </Link>
        </div>
      )}
    </div>
  );
}
