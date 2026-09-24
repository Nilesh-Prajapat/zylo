'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2, Sparkles, Video, ArrowLeft } from 'lucide-react';
import { RoleSwitchModal } from './RoleSwitchModal';

export function CreatorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-zylo-warm">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  if (user.role !== 'CREATOR') {
    return (
      <>
        <div className="mx-auto my-12 max-w-xl p-6 sm:p-8 select-none">
          <div className="rounded-3xl border border-zylo-border bg-white p-8 text-center shadow-xl space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B8FF3D] text-black shadow-sm">
              <Sparkles className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold text-zylo-purple border border-purple-200">
                CREATOR STUDIO ACCESS
              </span>
              <h2 className="text-2xl font-black text-zylo-text">Become a Creator to Access Studio</h2>
              <p className="text-xs font-bold text-zylo-secondary leading-relaxed max-w-md mx-auto">
                You are currently in Normal User mode. Switch to Creator mode to unlock live streaming, broadcast controls, virtual gift earnings, and creator analytics.
              </p>
            </div>

            <div className="rounded-2xl border border-zylo-border bg-zylo-warm p-4 text-left space-y-2">
              <h4 className="text-xs font-black uppercase text-zylo-text tracking-wider">Creator Features Included:</h4>
              <ul className="text-xs font-semibold text-zylo-secondary space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> Go Live & broadcast high-definition video
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> Real-time LiveKit media controls & viewer management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> Earn revenue from viewer gift donations
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center gap-2 rounded-xl border border-zylo-border bg-zylo-warm px-4 py-2.5 text-xs font-bold text-zylo-text hover:bg-zylo-soft transition w-full sm:w-auto justify-center cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Go Back Home
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#B8FF3D] px-6 py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs w-full sm:w-auto justify-center cursor-pointer"
              >
                <Sparkles className="h-4 w-4" /> Become a Creator Now
              </button>
            </div>
          </div>
        </div>

        <RoleSwitchModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          targetRole="CREATOR"
        />
      </>
    );
  }

  return <>{children}</>;
}
