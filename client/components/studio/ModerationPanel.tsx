'use client';

import { useState, useEffect } from 'react';
import { moderationApi } from '@/lib/api';
import { Shield, ShieldAlert, UserCheck, Clock, RefreshCw } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';

interface StreamModerationItem {
  id: string;
  type: 'MUTE' | 'TEMPORARY_BAN' | 'PERMANENT_BAN';
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface ModerationPanelProps {
  streamId: string;
}

export function ModerationPanel({ streamId }: ModerationPanelProps) {
  const [restrictions, setRestrictions] = useState<StreamModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRestrictions = async () => {
    try {
      setLoading(true);
      const data = await moderationApi.getActiveRestrictions(streamId);
      setRestrictions(data);
    } catch (err) {
      console.error('Failed to load moderation list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (streamId) fetchRestrictions();
  }, [streamId]);

  const handleUnban = async (userId: string) => {
    try {
      setActionLoadingId(userId);
      await moderationApi.unbanUser(streamId, userId);
      setRestrictions((prev) => prev.filter((r) => r.user.id !== userId));
    } catch (err) {
      alert('Failed to unban user');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zylo-border bg-white shadow-xs overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zylo-border px-4 py-3 bg-zylo-warm/30">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-zylo-purple" />
          <h3 className="text-xs font-extrabold text-zylo-text">Live Moderation Controls</h3>
        </div>
        <button
          onClick={fetchRestrictions}
          className="rounded-lg p-1 text-zylo-muted hover:bg-zylo-warm hover:text-zylo-text transition"
          title="Refresh restrictions"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Restrictions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {restrictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <UserCheck className="h-8 w-8 text-zylo-muted opacity-40 mb-2" />
            <p className="text-xs font-bold text-zylo-text">No active chat restrictions</p>
            <p className="text-[11px] text-zylo-muted mt-0.5">Muted or banned viewers will appear here.</p>
          </div>
        ) : (
          restrictions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zylo-border bg-white p-3 hover:border-zylo-purple/30 transition shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={item.user.avatarUrl} size="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-extrabold text-zylo-text">
                      {item.user.displayName || item.user.username}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        item.type === 'MUTE'
                          ? 'bg-amber-100 text-amber-700'
                          : item.type === 'TEMPORARY_BAN'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-zylo-muted truncate mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 inline" />
                    {item.expiresAt ? `Until ${new Date(item.expiresAt).toLocaleTimeString()}` : 'Permanent'}
                    {item.reason && ` • ${item.reason}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnban(item.user.id)}
                disabled={actionLoadingId === item.user.id}
                className="shrink-0 rounded-xl border border-zylo-border bg-zylo-warm px-3 py-1 text-xs font-extrabold text-zylo-text hover:bg-zylo-purple hover:text-white hover:border-zylo-purple transition disabled:opacity-50"
              >
                {actionLoadingId === item.user.id ? 'Processing...' : 'Unban'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
