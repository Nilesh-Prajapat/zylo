'use client';

import { useState, useEffect } from 'react';
import { socketClient } from '@/lib/socket';
import { Gem } from 'lucide-react';

interface GiftEvent {
  id: string;
  senderName: string;
  giftName: string;
  giftEmoji: string;
  quantity: number;
  totalPrice: number;
}

export function GiftNotificationTile({ streamId }: { streamId: string }) {
  const [activeGifts, setActiveGifts] = useState<GiftEvent[]>([]);

  useEffect(() => {
    socketClient.connect();

    const handleGiftSent = (data: {
      id?: string;
      senderName: string;
      giftName: string;
      giftEmoji: string;
      quantity: number;
      totalPrice: number;
    }) => {
      const giftId = data.id || `gift-${Date.now()}-${Math.random()}`;
      setActiveGifts((prev) => {
        if (prev.some((g) => g.id === giftId)) return prev;
        const newEvent: GiftEvent = {
          id: giftId,
          ...data,
        };
        return [newEvent, ...prev].slice(0, 3);
      });

      // Auto dismiss after 3.5s
      setTimeout(() => {
        setActiveGifts((prev) => prev.filter((g) => g.id !== giftId));
      }, 3500);
    };

    socketClient.on('gift:sent', handleGiftSent);

    return () => {
      socketClient.off('gift:sent', handleGiftSent);
    };

  }, [streamId]);

  if (activeGifts.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-[280px] w-full">
      {activeGifts.map((gift) => (
        <div
          key={gift.id}
          className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/80 backdrop-blur-md p-3 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zylo-purple/30 text-2xl border border-zylo-purple/40">
            {gift.giftEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-white">
              @{gift.senderName}
            </p>
            <p className="text-[11px] text-zylo-lime font-bold truncate">
              sent {gift.giftName} {gift.quantity > 1 ? `x${gift.quantity}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-zylo-purple/40 px-2 py-1 text-[10px] font-extrabold text-zylo-lime shrink-0">
            <Gem className="h-3 w-3" />
            <span>{gift.totalPrice}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
