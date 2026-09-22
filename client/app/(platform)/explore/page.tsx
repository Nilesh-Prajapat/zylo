'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Gamepad2,
  Heart,
  MessageCircle,
  Music2,
  Pencil,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { streamsApi, usersApi } from '@/lib/api';
import { Stream, UserProfile } from '@/lib/types';
import { StreamCard } from '@/components/shared/StreamCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Avatar } from '@/components/shared/Avatar';

const exploreCategories = [
  { label: 'Music', icon: Music2, bg: 'from-pink-500/10 to-purple-500/20', color: 'text-pink-600' },
  { label: 'Gaming', icon: Gamepad2, bg: 'from-blue-500/10 to-indigo-500/20', color: 'text-blue-600' },
  { label: 'Just Chatting', icon: MessageCircle, bg: 'from-purple-500/10 to-violet-500/20', color: 'text-zylo-purple' },
  { label: 'Dance', icon: Sparkles, bg: 'from-amber-500/10 to-yellow-500/20', color: 'text-amber-600' },
  { label: 'Art', icon: Pencil, bg: 'from-emerald-500/10 to-teal-500/20', color: 'text-emerald-600' },
  { label: 'Fitness', icon: Trophy, bg: 'from-rose-500/10 to-red-500/20', color: 'text-rose-600' },
];

export default function ExplorePage() {
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [sList, cList] = await Promise.all([
          streamsApi.getLiveStreams(),
          usersApi.getTrendingCreators(),
        ]);
        setLiveStreams(sList);
        setTrendingCreators(cList);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load explore content');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const trendingStreams = liveStreams.slice(0, 3);
  const recommendedStreams = liveStreams.slice(3);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8">
      {/* Explore Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text sm:text-4xl">
          Good people. <span className="text-zylo-purple">Brighter days.</span>
        </h1>
        <p className="mt-1.5 text-sm font-medium text-zylo-secondary max-w-lg">
          Explore live streams across music, gaming, creative arts, and real conversations.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Category Grid */}
      <section className="mb-10 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {exploreCategories.map(({ label, icon: Icon, bg, color }) => (
          <button
            key={label}
            onClick={() => setSelectedCat(label)}
            className={`group flex flex-col items-center gap-2.5 rounded-2xl border ${
              selectedCat === label ? 'border-zylo-purple bg-zylo-soft' : 'border-zylo-border'
            } bg-gradient-to-b ${bg} p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-sm`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-zylo-text">{label}</span>
          </button>
        ))}
      </section>

      {/* Trending Now */}
      <section className="mb-10">
        <SectionHeader
          title="Trending Now"
          subtitle="Top live broadcasts capturing the community right now"
        />
        {trendingStreams.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-zylo-border bg-white p-8 text-center text-xs font-semibold text-zylo-secondary shadow-sm">
            No live streams right now. Be the first to go live!
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {trendingStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/stream/${stream.id}`}
                className="group relative overflow-hidden rounded-2xl bg-zylo-text border border-zylo-border"
              >
                <div className="relative aspect-[1.3/1]">
                  {stream.thumbnailUrl ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="h-full w-full bg-zylo-warm flex items-center justify-center text-zylo-muted font-bold text-sm">
                      {stream.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="rounded bg-[#ff426d] px-2 py-0.5 text-[10px] font-extrabold text-white">
                      LIVE
                    </span>
                    <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                      <Users className="h-3 w-3" /> {stream.viewerCount || 0}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-base font-extrabold text-white leading-tight truncate">
                      {stream.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Avatar src={stream.broadcaster?.avatarUrl} size="h-6 w-6" />
                      <span className="text-xs font-semibold text-white/90">
                        {stream.broadcaster?.displayName || stream.broadcaster?.username}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Streams */}
      {recommendedStreams.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Recommended For You"
            subtitle="Tailored to your favorite categories and vibes"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recommendedStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Rising Creators */}
      <section className="mb-8">
        <SectionHeader
          title="Rising Creators"
          subtitle="Fresh voices building vibrant live spaces"
        />
        {trendingCreators.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-zylo-border bg-white p-6 text-center text-xs font-semibold text-zylo-secondary shadow-sm">
            No trending creators found.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trendingCreators.slice(0, 8).map((creator) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.id}`}
                className="flex items-center gap-3 rounded-2xl border border-zylo-border bg-white p-3.5 transition hover:bg-zylo-warm hover:border-zylo-purple/30"
              >
                <div className="relative shrink-0">
                  <Avatar src={creator.avatarUrl} size="h-12 w-12" ring />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="truncate text-sm font-extrabold text-zylo-text">
                      {creator.displayName || creator.username}
                    </h4>
                  </div>
                  <p className="truncate text-xs text-zylo-muted">@{creator.username}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zylo-muted shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
