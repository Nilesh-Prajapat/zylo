'use client';

import Link from 'next/link';
import { ChevronRight, Video, Eye, Radio } from 'lucide-react';
import type { Stream } from '@/lib/types';
import { Avatar } from '../shared/Avatar';

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

interface HeroFeatureProps {
  featuredStreams: Stream[];
}

export function HeroFeature({ featuredStreams }: HeroFeatureProps) {
  const primaryStream = featuredStreams[0];
  const secondaryStreams = featuredStreams.slice(1, 3);

  return (
    <section className="w-full min-h-[350px] lg:min-h-[380px]">
      <div className="grid gap-5 lg:grid-cols-[41%_59%] items-stretch min-h-[350px] lg:min-h-[380px]">
        {/* Left Panel (~41% width): Compact Discovery Card */}
        <div className="flex flex-col justify-between rounded-[20px] bg-[#F3EEFF] p-6 lg:p-7 border border-[#E9E5F2]">
          <div>
            <span className="inline-block rounded-full bg-[#7C3AED]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#7C3AED]">
              THE PLACE TO BE REAL
            </span>
            <h1 className="mt-3 text-3xl font-black leading-tight text-[#171322] sm:text-4xl">
              Live <span className="text-[#7C3AED]">Bolder.</span>
            </h1>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[#6F687D] max-w-sm font-medium">
              Real people. Real moments. Stream, connect, and join live communities in real time.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#7C3AED] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#6D28D9] shadow-xs"
              >
                Start Exploring <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/studio?golive=true"
                className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#B8FF3D] px-4 py-2.5 text-xs font-black text-black transition hover:bg-[#a5f025] shadow-xs"
              >
                <Video className="h-3.5 w-3.5 fill-black text-black" /> Go Live
              </Link>
            </div>
          </div>

          {/* Key Platform Statistics */}
          <div className="mt-6 pt-4 border-t border-[#E9E5F2]/80 grid grid-cols-3 gap-2 text-left">
            <div>
              <p className="text-base sm:text-lg font-black text-[#171322] leading-none">10K+</p>
              <p className="text-[10px] font-bold text-[#6F687D] mt-1">Creators</p>
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-[#171322] leading-none">1M+</p>
              <p className="text-[10px] font-bold text-[#6F687D] mt-1">Live Moments</p>
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-[#171322] leading-none">Real</p>
              <p className="text-[10px] font-bold text-[#6F687D] mt-1">Communities</p>
            </div>
          </div>
        </div>

        {/* Right Panel (~59% width): Featured Live Streams */}
        <div className="flex flex-col justify-between rounded-[20px] bg-white p-5 border border-[#E9E5F2] shadow-xs min-h-[350px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#171322] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              Featured Live Streams
            </h2>
            <Link href="/explore" className="text-xs font-bold text-[#7C3AED] hover:underline">
              See all →
            </Link>
          </div>

          {primaryStream ? (
            <div className="grid gap-3 flex-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr] items-stretch">
              {/* Primary Large Featured Card */}
              <Link
                href={`/stream/${primaryStream.id}`}
                className="group relative flex flex-col justify-end overflow-hidden rounded-[16px] bg-black border border-[#E9E5F2] min-h-[220px] lg:min-h-[280px]"
              >
                <img
                  src={primaryStream.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop'}
                  alt={primaryStream.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <span className="flex items-center gap-1.5 rounded-full bg-[#EF4444] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-extrabold text-white backdrop-blur border border-white/10">
                    <Eye className="h-3 w-3 text-white/90" />
                    <span>{formatViewers(primaryStream.viewerCount || 0)}</span>
                  </span>
                </div>

                {/* Bottom Stream Content */}
                <div className="relative z-10 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar src={primaryStream.broadcaster?.avatarUrl} size="h-6 w-6" ring />
                    <span className="text-xs font-bold text-white drop-shadow truncate">
                      {primaryStream.broadcaster?.displayName || primaryStream.broadcaster?.username}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white drop-shadow leading-snug line-clamp-2">
                    {primaryStream.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold text-white/80">
                    {primaryStream.category?.name || primaryStream.vibe || 'Music'}
                  </p>
                </div>
              </Link>

              {/* Secondary Stacked Stream Cards */}
              <div className="flex flex-col gap-3">
                {secondaryStreams.map((s) => (
                  <Link
                    key={s.id}
                    href={`/stream/${s.id}`}
                    className="group relative flex flex-col justify-end flex-1 overflow-hidden rounded-[14px] bg-black border border-[#E9E5F2] min-h-[125px]"
                  >
                    <img
                      src={s.thumbnailUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop'}
                      alt={s.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                      <span className="flex items-center gap-1 rounded-full bg-[#EF4444] px-2 py-0.5 text-[9px] font-black uppercase text-white">
                        LIVE
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur">
                        <Eye className="h-2.5 w-2.5" />
                        <span>{formatViewers(s.viewerCount || 0)}</span>
                      </span>
                    </div>

                    <div className="relative z-10 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Avatar src={s.broadcaster?.avatarUrl} size="h-5 w-5" />
                        <span className="text-[11px] font-bold text-white truncate">
                          {s.broadcaster?.displayName || s.broadcaster?.username}
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white truncate">{s.title}</h4>
                      <p className="text-[10px] font-medium text-white/80">{s.category?.name || s.vibe}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[16px] border border-dashed border-[#E9E5F2] p-6 text-center bg-[#FAFAFC]">
              <p className="text-xs text-[#6F687D]">No featured streams live right now</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
