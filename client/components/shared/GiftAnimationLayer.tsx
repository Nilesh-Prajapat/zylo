'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface GiftAnimationProps {
  giftName?: string | null;
  senderName?: string | null;
}

export function GiftAnimationLayer({ giftName, senderName }: GiftAnimationProps) {
  if (!giftName) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none transition-all duration-300 animate-in fade-in zoom-in">
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-zylo-lime/40 bg-zylo-text/90 px-8 py-6 text-white shadow-2xl shadow-zylo-purple/30 backdrop-blur-md">
        <div className="relative">
          <span className="text-7xl animate-bounce drop-shadow-2xl">{giftName}</span>
          <Sparkles className="absolute -top-3 -right-3 h-8 w-8 text-zylo-lime animate-spin" />
        </div>
        <p className="mt-2 text-sm font-extrabold tracking-wide text-zylo-lime">
          {senderName ? `${senderName} sent a ${giftName}!` : `Virtual Gift Sent: ${giftName}`}
        </p>
      </div>
    </div>
  );
}
