'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, ArrowRight } from 'lucide-react';
import { Stream } from '@/lib/types';
import { streamsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function ActiveStreamBanner() {
  const { user } = useAuth();
  const [activeStream, setActiveStream] = useState<Stream | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveStream(null);
      return;
    }

    streamsApi.getMyActiveStream()
      .then(setActiveStream)
      .catch(() => setActiveStream(null));

    // Poll periodically every 15 seconds to check active broadcast status
    const interval = setInterval(() => {
      streamsApi.getMyActiveStream()
        .then(setActiveStream)
        .catch(() => setActiveStream(null));
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  if (!activeStream) return null;

  return (
    <div className="mx-3 my-2 flex items-center justify-between rounded-2xl border border-zylo-purple/30 bg-zylo-soft p-3 text-xs shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff426d] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff426d]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-zylo-text">LIVE NOW</p>
          <p className="truncate text-[10px] text-zylo-secondary">{activeStream.title}</p>
        </div>
      </div>
      <Link
        href={`/studio/live/${activeStream.id}`}
        className="ml-2 flex shrink-0 items-center gap-1 rounded-xl bg-zylo-purple px-2.5 py-1.5 font-extrabold text-white transition hover:bg-[#6926d1]"
      >
        <span>Return</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
