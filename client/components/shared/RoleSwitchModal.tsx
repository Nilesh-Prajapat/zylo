'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { X, Sparkles, Video, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'NORMAL_USER' | 'CREATOR';
  isLiveNow?: boolean;
}

export function RoleSwitchModal({ isOpen, onClose, targetRole, isLiveNow = false }: RoleSwitchModalProps) {
  const { user, refreshSession } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isBecomingCreator = targetRole === 'CREATOR';

  const handleConfirm = async () => {
    if (isLiveNow && targetRole === 'NORMAL_USER') {
      setError('You are currently live. End your live stream before switching back to Normal User.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await usersApi.switchRole(targetRole);
      await refreshSession();
      onClose();

      if (targetRole === 'CREATOR') {
        router.push('/studio');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to switch role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zylo-border pb-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-xl p-2 ${isBecomingCreator ? 'bg-[#B8FF3D]/20 text-[#6D9E1C]' : 'bg-zylo-purple/10 text-zylo-purple'}`}>
              {isBecomingCreator ? <Sparkles className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zylo-text">
                {isBecomingCreator ? 'Become a Creator?' : 'Switch to Normal User?'}
              </h2>
              <p className="text-[11px] font-bold text-zylo-muted">
                {isBecomingCreator ? 'Unlock Creator Studio & Streaming' : 'Return to viewer mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Stream Safety Warning */}
        {isLiveNow && targetRole === 'NORMAL_USER' && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-black">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>You are currently live.</span>
            </div>
            <p className="text-xs font-semibold text-amber-700 leading-relaxed">
              End your live stream before switching back to Normal User mode.
            </p>
            <div className="pt-1 flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-300 transition"
              >
                Stay Live
              </button>
              <button
                onClick={() => { onClose(); router.push('/studio'); }}
                className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-amber-700 transition"
              >
                Go to Control Room <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Info Highlights */}
        {!isLiveNow && (
          <div className="rounded-2xl border border-zylo-border bg-zylo-warm/60 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-zylo-text uppercase tracking-wider">
              {isBecomingCreator ? 'What you get as a Creator:' : 'What changes:'}
            </h4>
            <ul className="space-y-1.5 text-xs font-semibold text-zylo-secondary leading-relaxed">
              {isBecomingCreator ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Access Creator Studio & Broadcast controls
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Receive virtual gifts & build creator earnings
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Redeem earnings for reward coupons
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> Your normal profile & coins remain intact
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-zylo-purple font-bold">•</span> Creator tools will be hidden
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zylo-purple font-bold">•</span> Cannot start new streams in Normal User mode
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zylo-purple font-bold">•</span> Your earned balance & transactions are preserved
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zylo-purple font-bold">•</span> You can switch back to Creator anytime
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        {/* Buttons */}
        {!isLiveNow && (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zylo-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-sm transition disabled:opacity-50 ${
                isBecomingCreator
                  ? 'bg-[#B8FF3D] text-black hover:bg-[#a6fa26]'
                  : 'bg-zylo-purple text-white hover:bg-[#6926d1]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Switching...</span>
                </>
              ) : (
                <span>{isBecomingCreator ? 'Become a Creator' : 'Switch to Normal User'}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
