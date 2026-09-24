'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Calendar, Check } from 'lucide-react';
import type { Stream } from '@/lib/types';
import { SectionHeader } from '../shared/SectionHeader';
import { Avatar } from '../shared/Avatar';

function formatScheduled(scheduledAt?: string | null): { date: string; time: string } {
  if (!scheduledAt) return { date: 'TODAY', time: '8:00 PM' };
  const d = new Date(scheduledAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const dateStr = isToday ? 'TODAY' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { date: dateStr, time: timeStr };
}

function UpcomingCard({ stream }: { stream: Stream }) {
  const [reminded, setReminded] = useState(false);
  const thumbnail = stream.thumbnailUrl || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&auto=format&fit=crop';
  const broadcaster = stream.broadcaster;
  const displayName = broadcaster?.displayName || broadcaster?.username || 'Creator';
  const avatarUrl = broadcaster?.avatarUrl;
  const categoryName = stream.category?.name || stream.vibe || 'Tech';
  const { date, time } = formatScheduled(stream.scheduledAt);

  return (
    <div className="group flex flex-col min-w-0 rounded-[16px] border border-[#E9E5F2] bg-white p-3 shadow-xs hover:border-[#7C3AED]/40 transition select-none">
      <Link href={`/stream/${stream.id}`} className="relative aspect-video w-full overflow-hidden rounded-[12px] bg-[#FAFAFC]">
        <img
          src={thumbnail}
          alt={stream.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Scheduled Date Badge */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-black shadow-xs">
          <Calendar className="h-2.5 w-2.5" />
          <span>{date} · {time}</span>
        </div>

        {/* Creator Overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-2">
          <Avatar src={avatarUrl} size="h-5 w-5" ring />
          <span className="truncate text-xs font-bold text-white drop-shadow">
            {displayName}
          </span>
        </div>
      </Link>

      <div className="mt-2.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="truncate text-xs font-extrabold text-[#171322] group-hover:text-[#7C3AED] transition">
            {stream.title}
          </h3>
          <span className="mt-1 inline-block rounded-md bg-[#F3EEFF] px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
            {categoryName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setReminded(!reminded)}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] py-1.5 text-xs font-bold transition cursor-pointer ${
            reminded
              ? 'bg-[#F3EEFF] text-[#7C3AED] border border-[#7C3AED]/30'
              : 'bg-[#171322] text-white hover:bg-[#7C3AED]'
          }`}
        >
          {reminded ? (
            <>
              <Check className="h-3.5 w-3.5" /> Reminder Set
            </>
          ) : (
            <>
              <Bell className="h-3.5 w-3.5" /> Remind Me
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface UpcomingSectionProps {
  streams: Stream[];
}

export function UpcomingSection({ streams }: UpcomingSectionProps) {
  if (!streams || streams.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Upcoming Live"
        subtitle="Scheduled broadcasts coming up soon — set a reminder!"
      />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {streams.map((stream) => (
          <UpcomingCard key={stream.id} stream={stream} />
        ))}
      </div>
    </section>
  );
}
