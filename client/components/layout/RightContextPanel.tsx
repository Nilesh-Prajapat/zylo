'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Gem, ChevronRight } from 'lucide-react';

export function RightContextPanel() {
  return (
    <aside className="hidden w-[310px] shrink-0 flex-col gap-5 border-l border-zylo-border bg-white p-5 xl:flex">
      {/* Editorial Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f5eeff] via-[#f9f5ff] to-[#f0ffdb] p-5 border border-zylo-border/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zylo-purple">
            Zylo Social
          </span>
          <Sparkles className="h-4 w-4 text-zylo-purple" />
        </div>
        <h3 className="mt-2 text-xl font-extrabold text-zylo-text leading-tight">
          Good People.<br />
          <span className="text-zylo-purple">Brighter Days.</span>
        </h3>
        <p className="mt-1.5 text-xs text-zylo-secondary leading-relaxed">
          Stream · Connect · Support · Be Real
        </p>
      </div>

      {/* Quick Navigation Widgets */}
      <div className="rounded-2xl border border-zylo-border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zylo-soft text-zylo-purple">
              <Gem className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-zylo-text">Virtual Gifts</h4>
              <p className="text-[10px] text-zylo-muted">Support creators you love</p>
            </div>
          </div>
          <Link href="/gifts" className="text-[10px] font-bold text-zylo-purple hover:underline">
            View All
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-zylo-warm p-2.5">
          <span className="text-xs font-bold text-zylo-text">Top up coins for live streaming</span>
          <Link
            href="/wallet"
            className="rounded-lg bg-zylo-lime px-3 py-1.5 text-[10px] font-extrabold text-zylo-text transition hover:brightness-95"
          >
            Top up
          </Link>
        </div>
      </div>

      {/* Discover Community */}
      <div className="rounded-2xl border border-zylo-border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-extrabold text-zylo-text">Community Hub</h4>
          <Link
            href="/explore"
            className="flex items-center gap-0.5 text-[10px] font-bold text-zylo-purple hover:underline"
          >
            Explore <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-zylo-secondary leading-relaxed">
          Discover live broadcasts, follow trending creators, and send virtual gifts.
        </p>
      </div>
    </aside>
  );
}
