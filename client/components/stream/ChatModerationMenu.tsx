'use client';

import React, { useState } from 'react';
import { Shield, VolumeX, Ban, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { moderationApi, streamsApi } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface ChatModerationMenuProps {
  streamId: string;
  messageId?: string;
  targetUser: {
    id: string;
    username: string;
    displayName?: string;
  };
  isBroadcaster: boolean;
  onClose: () => void;
  onMessageDeleted?: (messageId: string) => void;
}

export function ChatModerationMenu({
  streamId,
  messageId,
  targetUser,
  isBroadcaster,
  onClose,
  onMessageDeleted,
}: ChatModerationMenuProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = targetUser.displayName || targetUser.username;

  const handleMute = async (durationMinutes: number) => {
    setLoading(true);
    setError(null);
    try {
      await moderationApi.muteUser(streamId, {
        userId: targetUser.id,
        durationMinutes,
        reason: `Muted by ${isBroadcaster ? 'broadcaster' : 'moderator'}`,
      });
      setFeedback(`Muted @${targetUser.username} for ${durationMinutes}m`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to mute user');
      setLoading(false);
    }
  };

  const handleBan = async (permanent: boolean, durationMinutes = 60) => {
    setLoading(true);
    setError(null);
    try {
      await moderationApi.banUser(streamId, {
        userId: targetUser.id,
        permanent,
        durationMinutes: permanent ? undefined : durationMinutes,
        reason: `Banned by ${isBroadcaster ? 'broadcaster' : 'moderator'}`,
      });
      setFeedback(permanent ? `Permanently banned @${targetUser.username}` : `Banned @${targetUser.username} for 1h`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to ban user');
      setLoading(false);
    }
  };

  const handleDeleteMessage = () => {
    if (!messageId) return;
    socketClient.emit('chat:delete', { streamId, messageId });
    if (onMessageDeleted) onMessageDeleted(messageId);
    onClose();
  };

  return (
    <div className="absolute right-2 top-8 z-50 w-56 rounded-2xl border border-zylo-border bg-white p-2 shadow-2xl animate-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zylo-border mb-1">
        <div className="flex items-center gap-1.5 text-xs font-black text-zylo-text">
          <Shield className="h-3.5 w-3.5 text-zylo-purple" />
          <span className="truncate">@{targetUser.username}</span>
        </div>
      </div>

      {error && (
        <div className="p-2 mb-1 rounded-xl bg-red-50 text-[10px] font-bold text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {feedback ? (
        <div className="p-3 text-center text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5">
          <Check className="h-4 w-4" /> {feedback}
        </div>
      ) : loading ? (
        <div className="p-4 flex items-center justify-center text-zylo-purple">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-0.5 text-xs font-bold text-zylo-text">
          <button
            onClick={() => handleMute(5)}
            className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-zylo-warm transition text-left cursor-pointer"
          >
            <VolumeX className="h-3.5 w-3.5 text-amber-500" />
            <span>Mute (5 mins)</span>
          </button>

          <button
            onClick={() => handleMute(15)}
            className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-zylo-warm transition text-left cursor-pointer"
          >
            <VolumeX className="h-3.5 w-3.5 text-amber-600" />
            <span>Mute (15 mins)</span>
          </button>

          <button
            onClick={() => handleBan(false, 60)}
            className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-red-50 text-red-600 transition text-left cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 text-red-500" />
            <span>Ban User (1 Hour)</span>
          </button>

          <button
            onClick={() => handleBan(true)}
            className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-red-50 text-red-600 transition text-left cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 text-red-700" />
            <span>Ban Permanently</span>
          </button>

          {messageId && (
            <button
              onClick={handleDeleteMessage}
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-red-50 text-red-600 border-t border-zylo-border pt-1.5 text-left cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              <span>Delete Message</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
