'use client';

import { useState } from 'react';
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
  ArrowRight,
  X,
} from 'lucide-react';
import { useLiveStreams, useTrendingCreators } from '@/lib/hooks/use-queries';
import { StreamCard } from '@/components/shared/StreamCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Avatar } from '@/components/shared/Avatar';

const exploreCategories = [
  {
    label: 'Music',
    subtitle: 'Live beats.\nReal vibes.',
    image: '/category/music.webp',
    fallbackImage: '/category/music.png',
    bgColor: 'bg-[#f4effc]',
    btnBg: 'bg-[#ebdffc] text-[#7C3AED]',
    btnHover: 'group-hover:bg-[#7C3AED] group-hover:text-white',
    theme: 'purple',
  },
  {
    label: 'Gaming',
    subtitle: 'Play. Stream.\nBuild together.',
    image: '/category/gaming.webp',
    fallbackImage: '/category/gaming.png',
    bgColor: 'bg-[#f3fce8]',
    btnBg: 'bg-[#e4f9cc] text-[#4D7C0F]',
    btnHover: 'group-hover:bg-[#4D7C0F] group-hover:text-white',
    theme: 'green',
  },
  {
    label: 'Just Chatting',
    subtitle: 'Real people.\nReal talks.',
    image: '/category/chatting.webp',
    fallbackImage: '/category/chatting.png',
    bgColor: 'bg-[#f4effc]',
    btnBg: 'bg-[#ebdffc] text-[#7C3AED]',
    btnHover: 'group-hover:bg-[#7C3AED] group-hover:text-white',
    theme: 'purple',
  },
  {
    label: 'Dance',
    subtitle: 'Move. Inspire.\nBelong.',
    image: '/category/dance.webp',
    fallbackImage: '/category/dance.png',
    bgColor: 'bg-[#f3fce8]',
    btnBg: 'bg-[#e4f9cc] text-[#4D7C0F]',
    btnHover: 'group-hover:bg-[#4D7C0F] group-hover:text-white',
    theme: 'green',
  },
  {
    label: 'Art',
    subtitle: 'Create. Share.\nGrow.',
    image: '/category/art.webp',
    fallbackImage: '/category/art.png',
    bgColor: 'bg-[#f4effc]',
    btnBg: 'bg-[#ebdffc] text-[#7C3AED]',
    btnHover: 'group-hover:bg-[#7C3AED] group-hover:text-white',
    theme: 'purple',
  },
  {
    label: 'Fitness',
    subtitle: 'Stronger\ntogether.',
    image: '/category/fitness.webp',
    fallbackImage: '/category/fitness.png',
    bgColor: 'bg-[#f3fce8]',
    btnBg: 'bg-[#e4f9cc] text-[#4D7C0F]',
    btnHover: 'group-hover:bg-[#4D7C0F] group-hover:text-white',
    theme: 'green',
  },
];

/* ── Shimmer Skeletons ── */
function TrendingStreamSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zylo-border bg-white">
      <div className="relative aspect-[1.3/1] bg-[#ECE8F5] animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-[#ECE8F5] animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#ECE8F5] animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-[#ECE8F5] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function CreatorCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zylo-border bg-white p-3.5 animate-pulse">
      <div className="h-12 w-12 rounded-full bg-[#ECE8F5] shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-24 rounded bg-[#ECE8F5]" />
        <div className="h-2.5 w-16 rounded bg-[#ECE8F5]" />
      </div>
      <div className="h-4 w-4 rounded bg-[#ECE8F5] shrink-0" />
    </div>
  );
}

export default function ExplorePage() {
  const [selectedCat, setSelectedCat] = useState<string>('All');

  const { data: liveStreams = [], isLoading: loadingStreams, error: streamsError } = useLiveStreams();
  const { data: trendingCreators = [], isLoading: loadingCreators } = useTrendingCreators();

  const loading = loadingStreams;
  const error = (streamsError as any)?.message || '';

  const handleCategorySelect = (catLabel: string) => {
    const nextCat = selectedCat === catLabel ? 'All' : catLabel;
    setSelectedCat(nextCat);
    if (nextCat !== 'All') {
      setTimeout(() => {
        const el = document.getElementById('category-filtered-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const trendingStreams = liveStreams.slice(0, 3);
  const recommendedStreams = liveStreams.slice(3);

  const categoryStreams = selectedCat === 'All' ? [] : liveStreams.filter((s) => {
    const catLower = selectedCat.toLowerCase();
    return (
      (s.vibe && s.vibe.toLowerCase() === catLower) ||
      s.title.toLowerCase().includes(catLower) ||
      (s.description && s.description.toLowerCase().includes(catLower))
    );
  });

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
      <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {exploreCategories.map((cat) => {
          const isSelected = selectedCat === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => handleCategorySelect(cat.label)}
              className={`group relative flex h-[155px] sm:h-[165px] w-full overflow-hidden rounded-[24px] ${cat.bgColor} p-5 sm:p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none ${
                isSelected ? 'ring-2 ring-zylo-purple' : ''
              }`}
            >
              {/* Left Section: Text Content */}
              <div className="relative z-10 flex h-full w-[50%] flex-col justify-between pointer-events-none">
                <div>
                  <h3 className="text-xl sm:text-[22px] font-extrabold text-[#18181B] tracking-tight leading-none">
                    {cat.label}
                  </h3>
                  <p className="mt-2 text-xs font-medium text-[#64748B] leading-snug whitespace-pre-line">
                    {cat.subtitle}
                  </p>
                </div>

                {/* Small circular arrow button */}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${cat.btnBg} ${cat.btnHover} transition-all duration-200 shadow-2xs`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Background Artwork Image Covering Whole Card */}
              <div className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.label}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.tried) {
                      target.dataset.tried = 'true';
                      target.src = cat.fallbackImage;
                    }
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </button>
          );
        })}
      </section>

      {/* Active Selected Category Section */}
      {selectedCat !== 'All' && (
        <section id="category-filtered-section" className="mb-10 scroll-mt-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              title={`${selectedCat} Broadcasts`}
              subtitle={`Viewing all live streams in ${selectedCat}`}
            />
            <button
              onClick={() => setSelectedCat('All')}
              className="flex items-center gap-1.5 rounded-xl border border-zylo-border bg-white px-3 py-1.5 text-xs font-bold text-zylo-secondary hover:bg-zylo-warm hover:text-zylo-text transition shadow-xs cursor-pointer"
            >
              <span>Clear Filter</span>
              <X className="h-3.5 w-3.5 text-zylo-muted" />
            </button>
          </div>

          {categoryStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-zylo-border bg-white p-8 text-center shadow-xs">
              <p className="text-sm font-extrabold text-zylo-text">No active live streams in {selectedCat} right now.</p>
              <p className="mt-1 text-xs font-medium text-zylo-muted">Be the first creator to go live in {selectedCat}!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categoryStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Now */}
      <section className="mb-10">
        <SectionHeader
          title="Trending Now"
          subtitle="Top live broadcasts capturing the community right now"
        />
        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <TrendingStreamSkeleton key={i} />
            ))}
          </div>
        ) : trendingStreams.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-zylo-border bg-white p-8 text-center shadow-xs">
            <p className="text-sm font-extrabold text-zylo-text">No live streams right now.</p>
            <p className="mt-1 text-xs font-medium text-zylo-muted">Be the first to go live on Zylo!</p>
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
        {loadingCreators ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : trendingCreators.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-zylo-border bg-white p-8 text-center shadow-xs">
            <p className="text-sm font-extrabold text-zylo-text">No trending creators found.</p>
            <p className="mt-1 text-xs font-medium text-zylo-muted">Check back soon as new creators join!</p>
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
