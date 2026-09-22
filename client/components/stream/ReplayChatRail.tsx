'use client';

import { useState, useMemo } from 'react';
import { ChatMessage } from '@/lib/types';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';

interface ReplayChatRailProps {
  messages: ChatMessage[];
  currentTime: number; // video current time in seconds
  streamStartedAt?: string | null;
}

export function ReplayChatRail({ messages, currentTime, streamStartedAt }: ReplayChatRailProps) {
  const [enabled, setEnabled] = useState(true);

  // Filter messages up to currentTime based on streamOffsetSeconds or createdAt timestamp
  const visibleMessages = useMemo(() => {
    if (!enabled || !messages.length) return [];

    return messages.filter((msg) => {
      if (typeof msg.streamOffsetSeconds === 'number' && msg.streamOffsetSeconds >= 0) {
        return msg.streamOffsetSeconds <= currentTime;
      }
      if (streamStartedAt) {
        const msgTime = new Date(msg.createdAt).getTime();
        const startTime = new Date(streamStartedAt).getTime();
        const offset = (msgTime - startTime) / 1000;
        return offset <= currentTime;
      }
      return true;
    });
  }, [messages, currentTime, streamStartedAt, enabled]);

  if (!enabled) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 bg-zylo-warm/40 border-l border-zylo-border rounded-2xl text-center">
        <MessageSquare className="h-8 w-8 text-zylo-muted mb-2 opacity-50" />
        <p className="text-xs font-bold text-zylo-muted mb-3">Live Chat Replay is disabled</p>
        <button
          onClick={() => setEnabled(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zylo-purple px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-zylo-purple-hover transition"
        >
          <Eye className="h-3.5 w-3.5" /> Enable Chat Replay
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-zylo-border bg-white shadow-xs overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zylo-border px-4 py-3 bg-zylo-warm/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zylo-purple" />
          <span className="text-xs font-extrabold text-zylo-text">Live Chat Replay</span>
          <span className="rounded-full bg-zylo-soft px-2 py-0.5 text-[10px] font-black uppercase text-zylo-purple">
            Read-only
          </span>
        </div>
        <button
          onClick={() => setEnabled(false)}
          className="rounded-lg p-1 text-zylo-muted hover:bg-zylo-warm hover:text-zylo-text transition"
          title="Hide chat replay"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-zylo-muted">
            No replay messages at this timestamp ({Math.floor(currentTime)}s)
          </div>
        ) : (
          visibleMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5 group">
              <Avatar src={msg.user?.avatarUrl} size="h-6 w-6" className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-zylo-text truncate">
                    {msg.user?.displayName || msg.user?.username || 'Viewer'}
                  </span>
                  <span className="text-[10px] text-zylo-muted font-mono">
                    {formatTimestamp(msg.streamOffsetSeconds, msg.createdAt, streamStartedAt)}
                  </span>
                </div>
                <p className="text-xs text-zylo-text break-words mt-0.5">{msg.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Banner */}
      <div className="border-t border-zylo-border p-3 bg-zylo-warm/20 text-center">
        <p className="text-[11px] font-bold text-zylo-muted">
          Replay chat is locked. New messages cannot be sent to ended broadcasts.
        </p>
      </div>
    </div>
  );
}

function formatTimestamp(offset?: number | null, createdAt?: string, streamStartedAt?: string | null): string {
  let secs = 0;
  if (typeof offset === 'number' && offset >= 0) {
    secs = offset;
  } else if (createdAt && streamStartedAt) {
    secs = Math.max(0, (new Date(createdAt).getTime() - new Date(streamStartedAt).getTime()) / 1000);
  }
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
