'use client';

import Link from 'next/link';
import { Radio, Compass, Loader2 } from 'lucide-react';
import { useFollowingFeed } from '@/lib/hooks/useData';
import { StreamCard } from '@/components/shared/StreamCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Avatar } from '@/components/shared/Avatar';

export default function FollowingPage() {
  const { data, isLoading, error } = useFollowingFeed();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

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

      {/* Creator Story Rail */}
      {creators.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none">
            {creators.map((creator: any) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.id}`}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative p-0.5 rounded-full border-2 border-zylo-purple/30 group-hover:border-zylo-purple transition">
                  <Avatar src={creator.avatarUrl} size="h-12 w-12 sm:h-14 sm:w-14" />
                  {creator.isLive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-zylo-lime px-2 py-0.2 text-[9px] font-black uppercase text-black border border-white shadow-xs">
                      LIVE
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-zylo-text truncate max-w-[72px]">
                  {creator.displayName || creator.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Live Now Priority Section */}
      {liveStreams.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Live Now"
            subtitle="Followed creators currently streaming live"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {liveStreams.map((stream: any) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Published Section */}
      {recentlyPublished.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Recently Published"
            subtitle="Replays and videos from creators you follow"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentlyPublished.map((stream: any) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {creators.length === 0 && (
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
