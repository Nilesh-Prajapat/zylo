'use client';

import { useState, useEffect } from 'react';
import { streamAnalyticsApi } from '@/lib/api';
import { Trophy, Gem, RefreshCw } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';

interface SupporterItem {
  rank: number;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  totalPoints: number;
}

interface SupporterLeaderboardProps {
  streamId: string;
}

export function SupporterLeaderboard({ streamId }: SupporterLeaderboardProps) {
  const [scope, setScope] = useState<'stream' | 'lifetime'>('stream');
  const [supporters, setSupporters] = useState<SupporterItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSupporters = async () => {
    try {
      setLoading(true);
      const data = await streamAnalyticsApi.getSupporters(streamId, scope);
      setSupporters(data);
    } catch (err) {
      console.error('Failed to load supporter leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (streamId) fetchSupporters();
  }, [streamId, scope]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zylo-border bg-white shadow-xs overflow-hidden select-none">
      {/* Header & Scope Toggle */}
      <div className="flex items-center justify-between border-b border-zylo-border px-4 py-3 bg-zylo-warm/30">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-extrabold text-zylo-text">Top Supporters</h3>
        </div>
        <button
          onClick={fetchSupporters}
          className="rounded-lg p-1 text-zylo-muted hover:bg-zylo-warm hover:text-zylo-text transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Scope Selector */}
      <div className="flex border-b border-zylo-border bg-zylo-warm/10 p-1">
        <button
          onClick={() => setScope('stream')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-extrabold transition ${
            scope === 'stream'
              ? 'bg-white text-zylo-purple shadow-2xs'
              : 'text-zylo-muted hover:text-zylo-text'
          }`}
        >
          This Stream
        </button>
        <button
          onClick={() => setScope('lifetime')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-extrabold transition ${
            scope === 'lifetime'
              ? 'bg-white text-zylo-purple shadow-2xs'
              : 'text-zylo-muted hover:text-zylo-text'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Leaderboard Ranks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {supporters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-xs font-bold text-zylo-muted">
            <Trophy className="h-7 w-7 text-zylo-muted opacity-30 mb-2" />
            No supporters yet. Be the first to send a gift!
          </div>
        ) : (
          supporters.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between gap-2.5 rounded-xl border border-zylo-border/60 bg-white p-2.5 hover:border-zylo-purple/30 transition shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Rank Badge */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    item.rank === 1
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : item.rank === 2
                      ? 'bg-slate-200 text-slate-700'
                      : item.rank === 3
                      ? 'bg-amber-800/10 text-amber-900'
                      : 'bg-zylo-warm text-zylo-muted'
                  }`}
                >
                  0{item.rank}
                </span>

                <Avatar src={item.user?.avatarUrl} size="h-7 w-7" />

                <span className="truncate text-xs font-extrabold text-zylo-text">
                  {item.user?.displayName || item.user?.username || 'Supporter'}
                </span>
              </div>

              {/* Total Gift Points */}
              <div className="flex items-center gap-1 shrink-0 rounded-lg bg-zylo-soft px-2 py-0.5 text-xs font-extrabold text-zylo-purple">
                <Gem className="h-3 w-3" />
                <span>{item.totalPoints.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
