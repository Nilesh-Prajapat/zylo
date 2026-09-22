'use client';

import { useState, useEffect } from 'react';
import { Gift, Wallet } from '@/lib/types';
import { giftApi, walletApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { X, Gem, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  broadcasterName: string;
}

export function GiftModal({ isOpen, onClose, streamId, broadcasterName }: GiftModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [balanceSource, setBalanceSource] = useState<'PERSONAL_COINS' | 'CREATOR_EARNINGS'>('PERSONAL_COINS');
  const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('SELECT');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isCreator = user?.role === 'CREATOR' || user?.role === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setStep('SELECT');
      setSelectedGift(null);
      setErrorMessage('');

      Promise.all([giftApi.getGifts(), walletApi.getWallet()])
        .then(([gList, wData]) => {
          setGifts(gList);
          setWallet(wData.wallet);
        })
        .catch((err) => {
          console.error('Failed to load gift catalog or wallet', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBalance = balanceSource === 'CREATOR_EARNINGS'
    ? wallet?.creatorEarnings || 0
    : wallet?.purchasedCoins || 0;

  const handleSelectGift = (gift: Gift) => {
    setSelectedGift(gift);
    setStep('CONFIRM');
  };

  const handleConfirmSend = async () => {
    if (!selectedGift || !streamId) return;

    if (currentBalance < selectedGift.price) {
      setErrorMessage(`Insufficient balance. Required: ${selectedGift.price} points, Available: ${currentBalance}`);
      setStep('ERROR');
      return;
    }

    try {
      setStep('PROCESSING');
      await giftApi.sendGift(streamId, selectedGift.id, 1, balanceSource);

      // Invalidate wallet query cache
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: queryKeys.streamSupporters(streamId) });

      setStep('SUCCESS');
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to send gift');
      setStep('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={step === 'PROCESSING'}
          className="absolute top-5 right-5 rounded-full p-2 text-zylo-muted hover:bg-zylo-warm hover:text-zylo-text transition disabled:opacity-30"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-zylo-purple">
            <Gem className="h-4 w-4" /> Virtual Gifts
          </div>
          <h2 className="text-2xl font-extrabold text-zylo-text">
            Support @{broadcasterName}
          </h2>
        </div>

        {/* STEP: SELECT GIFT */}
        {step === 'SELECT' && (
          <div>
            {/* Balance Source Selector */}
            <div className="mb-4 rounded-2xl border border-zylo-border bg-zylo-warm/40 p-3">
              <p className="text-[11px] font-bold text-zylo-muted mb-2">Pay from balance:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceSource('PERSONAL_COINS')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-extrabold transition ${
                    balanceSource === 'PERSONAL_COINS'
                      ? 'border-zylo-purple bg-white text-zylo-purple shadow-xs'
                      : 'border-zylo-border bg-transparent text-zylo-muted hover:bg-white'
                  }`}
                >
                  <span>My Coins</span>
                  <span className="text-[11px] font-mono text-zylo-text mt-0.5">✦ {wallet?.purchasedCoins || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => isCreator && setBalanceSource('CREATOR_EARNINGS')}
                  disabled={!isCreator}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-extrabold transition ${
                    !isCreator
                      ? 'opacity-40 border-zylo-border cursor-not-allowed text-zylo-muted'
                      : balanceSource === 'CREATOR_EARNINGS'
                      ? 'border-zylo-purple bg-white text-zylo-purple shadow-xs'
                      : 'border-zylo-border bg-transparent text-zylo-muted hover:bg-white'
                  }`}
                >
                  <span>Creator Earnings</span>
                  <span className="text-[11px] font-mono text-zylo-text mt-0.5">✦ {wallet?.creatorEarnings || 0}</span>
                </button>
              </div>
            </div>

            {/* Gift Grid */}
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-zylo-purple" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleSelectGift(gift)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-zylo-border bg-white p-3 hover:border-zylo-purple hover:bg-zylo-warm/30 hover:scale-105 transition shadow-xs group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition">{gift.emoji}</span>
                    <span className="text-xs font-extrabold text-zylo-text truncate max-w-full">{gift.name}</span>
                    <span className="rounded-full bg-zylo-soft px-2 py-0.5 text-[10px] font-extrabold text-zylo-purple">
                      ✦ {gift.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP: CONFIRMATION */}
        {step === 'CONFIRM' && selectedGift && (
          <div className="py-2">
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-zylo-warm/30 border border-zylo-border mb-5">
              <span className="text-5xl mb-2">{selectedGift.emoji}</span>
              <h3 className="text-lg font-extrabold text-zylo-text">Send {selectedGift.name}?</h3>
              <p className="text-xs text-zylo-muted mt-1">
                Amount: <strong className="text-zylo-purple">✦ {selectedGift.price} points</strong>
              </p>
              <p className="text-xs text-zylo-muted mt-0.5">
                Pay from: <strong>{balanceSource === 'CREATOR_EARNINGS' ? 'Creator Earnings' : 'My Coins'}</strong>
              </p>
              <p className="text-[11px] text-zylo-muted mt-1 border-t border-zylo-border pt-2 w-full">
                Remaining Balance after gift: <span className="font-bold text-zylo-text">✦ {currentBalance - selectedGift.price}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="flex-1 rounded-xl border border-zylo-border bg-zylo-warm py-3 text-xs font-extrabold text-zylo-text hover:bg-zylo-soft transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 rounded-xl bg-zylo-lime py-3 text-xs font-black text-black hover:brightness-95 transition shadow-xs"
              >
                Send Gift
              </button>
            </div>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'PROCESSING' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-zylo-purple mb-3" />
            <h3 className="text-base font-extrabold text-zylo-text">Sending Gift...</h3>
            <p className="text-xs text-zylo-muted mt-1">Processing backend transaction securely.</p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'SUCCESS' && selectedGift && (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-extrabold text-zylo-text">Gift Sent!</h3>
            <p className="text-xs text-zylo-muted mt-1">
              You sent {selectedGift.name} ({selectedGift.emoji}) to @{broadcasterName}!
            </p>
          </div>
        )}

        {/* STEP: ERROR */}
        {step === 'ERROR' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
            <h3 className="text-base font-extrabold text-zylo-text">Gift Failed</h3>
            <p className="text-xs text-red-600 mt-1 max-w-xs">{errorMessage}</p>
            <button
              onClick={() => setStep('SELECT')}
              className="mt-4 rounded-xl bg-zylo-purple px-5 py-2 text-xs font-extrabold text-white transition hover:bg-zylo-purple-hover"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
