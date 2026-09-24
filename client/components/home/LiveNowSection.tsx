'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';
import type { Stream } from '@/lib/types';
import { StreamCard } from '../shared/StreamCard';
import { SectionHeader } from '../shared/SectionHeader';

interface LiveNowSectionProps {
  streams: Stream[];
  loading?: boolean;
}

export function LiveNowSection({ streams, loading }: LiveNowSectionProps) {
  return (
    <section>
      <SectionHeader
        title="Live Now"
        subtitle="Real people, real vibes — live on Zylo right now"
        action="See all"
        actionHref="/explore"
      />

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-video w-full animate-pulse rounded-[14px] bg-[#E9E5F2]/50" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-[#E9E5F2]/50" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#E9E5F2]/40" />
            </div>
          ))}
        </div>
      ) : streams.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[20px] border border-[#E9E5F2] bg-white p-10 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EEFF] text-[#7C3AED]">
            <Radio className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-[#171322]">No streams in this category</h3>
          <p className="mt-1 text-xs text-[#6F687D] max-w-sm">
            Check out other categories or be the first to start a stream.
          </p>
          <Link
            href="/studio?golive=true"
            className="mt-5 rounded-[12px] bg-[#7C3AED] px-5 py-2.5 text-xs font-black text-white shadow-xs hover:bg-[#6D28D9] transition"
          >
            Go Live Now
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </section>
  );
}
