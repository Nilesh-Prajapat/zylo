'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Compass,
  Gamepad2,
  Heart,
  LayoutGrid,
  MessageCircle,
  Music2,
  Pencil,
  Play,
  Sparkles,
  Trophy,
  Zap,
  Radio,
  AlertCircle,
} from 'lucide-react';
import { StreamCard } from '@/components/shared/StreamCard';
import { CreatorRow } from '@/components/shared/CreatorRow';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Stream, UserProfile } from '@/lib/types';
import { useLiveStreams, useUpcomingStreams, useTrendingCreators } from '@/lib/hooks/use-queries';

const categories: { label: string; icon: typeof Music2 }[] = [
  { label: 'All', icon: LayoutGrid },
  { label: 'Music', icon: Music2 },
  { label: 'Gaming', icon: Gamepad2 },
  { label: 'Just Chatting', icon: MessageCircle },
  { label: 'Dance', icon: Sparkles },
  { label: 'Art', icon: Pencil },
  { label: 'Fitness', icon: Trophy },
  { label: 'Outdoors', icon: Compass },
  { label: 'Lifestyle', icon: Heart },
  { label: 'Tech', icon: Zap },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data: streams = [], isLoading: loadingStreams, error: streamsError } = useLiveStreams();
  const { data: upcomingStreams = [] } = useUpcomingStreams();
  const { data: creators = [], isLoading: loadingCreators } = useTrendingCreators();

  const loading = loadingStreams;
  const error = (streamsError as any)?.message || null;

  const featuredStream = streams[0];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8">
      {/* 1. Editorial Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eee7ff] via-[#f5eeff] to-[#f8f4ff] border border-zylo-border/60 shadow-xs">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 z-10">
            <span className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-zylo-purple">
              The place to be real
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] text-zylo-text sm:text-5xl">
              Live <span className="text-zylo-purple">Bolder.</span>
            </h1>
            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-zylo-secondary">
              Real people. Real moments. Only on Zylo. Stream, connect, and join live communities in real time.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-zylo-lime px-5 py-3 text-xs font-extrabold text-zylo-text transition duration-200 hover:brightness-95 shadow-xs"
              >
                Start Exploring <ChevronRight className="h-4 w-4" />
              </Link>
              {featuredStream && (
                <Link
                  href={`/stream/${featuredStream.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-zylo-border bg-white px-4 py-3 text-xs font-bold text-zylo-text transition hover:bg-zylo-warm"
                >
                  <Play className="h-3.5 w-3.5 fill-current text-zylo-purple" /> Watch Featured
                </Link>
              )}
            </div>
          </div>

          <div className="relative aspect-[1.3/1] lg:aspect-square overflow-hidden bg-zylo-warm">
            <img
              src={featuredStream?.thumbnailUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop"}
              alt="Live stream preview"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#eee7ff] via-transparent to-transparent lg:from-transparent" />
          </div>
        </div>
      </section>

      {/* 2. Categories Section */}
      <section className="mt-8">
        <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
          {categories.map(({ label, icon: Icon }) => {
            const isSelected = selectedCategory === label;
            return (
              <button
                key={label}
                onClick={() => setSelectedCategory(label)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isSelected
                    ? 'bg-zylo-purple text-white shadow-md shadow-zylo-purple/20'
                    : 'bg-white border border-zylo-border text-zylo-secondary hover:bg-zylo-soft hover:text-zylo-purple'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Live Now Section */}
      <section className="mt-9">
        <SectionHeader
          title="Live Now"
          subtitle="Real people, real vibes — live on Zylo right now"
          action="See all"
        />

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-zylo-border/40" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="mt-2 text-xs font-bold text-red-700">{error}</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-zylo-border bg-white p-12 text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zylo-warm text-zylo-purple">
              <Radio className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zylo-text">No one is live right now</h3>
            <p className="mt-1 text-xs text-zylo-secondary">Be the first to start a live stream and connect with viewers.</p>
            <Link
              href="/studio?golive=true"
              className="mt-5 rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#6926d1] transition"
            >
              Go Live Now
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Upcoming Live Streams Section */}
      {upcomingStreams.length > 0 && (
        <section className="mt-10">
          <SectionHeader
            title="Upcoming Live"
            subtitle="Scheduled broadcasts coming up soon — set a reminder!"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {upcomingStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Trending Creators Section */}
      {creators.length > 0 && (
        <section className="mt-10">
          <SectionHeader
            title="Trending Creators"
            subtitle="Creators you'll love right now"
            action="View all"
          />
          <div className="mt-4">
            <CreatorRow creators={creators} />
          </div>
        </section>
      )}
    </div>
  );
}
