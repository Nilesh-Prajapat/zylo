'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMyActiveStream } from '@/lib/hooks/use-queries';

export function ActiveStreamBanner() {
  const { user } = useAuth();
  const { data: activeStream } = useMyActiveStream();

  if (!user || !activeStream) return null;

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
