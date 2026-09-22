'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ArrowLeft, Radio, User, Loader2 } from 'lucide-react';
import { Stream, UserProfile } from '@/lib/types';
import { streamsApi, usersApi } from '@/lib/api';
import { StreamCard } from '@/components/shared/StreamCard';
import { CreatorCard } from '@/components/shared/CreatorCard';

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams?.get('q') || '';

  const [streams, setStreams] = useState<Stream[]>([]);
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setStreams([]);
      setCreators([]);
      return;
    }

    let isMounted = true;
    async function performSearch() {
      setLoading(true);
      try {
        const [liveList, creatorList] = await Promise.all([
          streamsApi.getLiveStreams(),
          usersApi.getTrendingCreators(),
        ]);

        if (!isMounted) return;

        const q = query.toLowerCase();
        const matchedStreams = liveList.filter(
          (s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
        );
        const matchedCreators = creatorList.filter(
          (c) => c.displayName?.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
        );

        setStreams(matchedStreams);
        setCreators(matchedCreators);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    performSearch();
    return () => { isMounted = false; };
  }, [query]);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 space-y-8">
      {/* Top Search Navigation Header */}
      <div className="flex items-center gap-4 border-b border-zylo-border pb-6">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zylo-border bg-white text-zylo-secondary hover:bg-zylo-warm transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-zylo-text">
            Search Results for "{query}"
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Creators Section */}
          <div>
            <h2 className="text-lg font-extrabold text-zylo-text mb-4">Creators ({creators.length})</h2>
            {creators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((c) => (
                  <CreatorCard key={c.id} creator={c} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zylo-muted">No creators matching "{query}".</p>
            )}
          </div>

          {/* Live Streams Section */}
          <div>
            <h2 className="text-lg font-extrabold text-zylo-text mb-4">Live Streams ({streams.length})</h2>
            {streams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.map((s) => (
                  <StreamCard key={s.id} stream={s} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zylo-muted">No live streams matching "{query}".</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
