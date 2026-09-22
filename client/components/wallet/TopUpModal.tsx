'use client';

import React, { useState } from 'react';
import { walletApi } from '@/lib/api';
import { X, Gem, CreditCard, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PACKAGES = [
  { coins: 500, price: 5.0, label: '500 Coins', bonus: '' },
  { coins: 1200, price: 10.0, label: '1,200 Coins', bonus: '+100 Bonus' },
  { coins: 3200, price: 25.0, label: '3,200 Coins', bonus: '+350 Bonus' },
  { coins: 7000, price: 50.0, label: '7,000 Coins', bonus: '+1,000 Bonus' },
];

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('SELECT');
  const [selectedPack, setSelectedPack] = useState(PACKAGES[0]);
  const [paymentMethod] = useState('Visa •••• 4242');
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartPayment = () => {
    setStep('CONFIRM');
  };

  const handlePayNow = async () => {
    setStep('PROCESSING');
    setErrorMsg(null);

    try {
      // Simulate fake payment delay (1.2s)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const res = await walletApi.topUp({
        amountCoins: selectedPack.coins,
        amountUsd: selectedPack.price,
        paymentMethod,
        idempotencyKey: `topup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      setNewBalance(res.wallet?.purchasedCoins ?? null);
      setStep('SUCCESS');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Simulated payment failed.');
      setStep('FAILED');
    }
  };

  const handleReset = () => {
    setStep('SELECT');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zylo-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#B8FF3D]/20 p-2 text-black">
              <Gem className="h-5 w-5 text-zylo-purple" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zylo-text">Top Up Coins</h2>
              <p className="text-[11px] font-bold text-zylo-muted">Simulated Payment System (MVP)</p>
            </div>
          </div>
          {step !== 'PROCESSING' && (
            <button
              onClick={onClose}
              className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* STEP 1: Select Package */}
        {step === 'SELECT' && (
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-wider text-zylo-muted">
              Select Coin Package
            </label>

            <div className="grid grid-cols-2 gap-3">
              {PACKAGES.map((pack) => {
                const isSelected = selectedPack.coins === pack.coins;
                return (
                  <button
                    key={pack.coins}
                    type="button"
                    onClick={() => setSelectedPack(pack)}
                    className={`flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-zylo-purple bg-zylo-soft/50 ring-2 ring-zylo-purple/30'
                        : 'border-zylo-border bg-white hover:border-zylo-purple/40 hover:bg-zylo-warm/40'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-base font-black text-zylo-text">+{pack.coins.toLocaleString()}</span>
                      {pack.bonus && (
                        <span className="rounded-md bg-[#B8FF3D] px-1.5 py-0.5 text-[9px] font-black text-black">
                          {pack.bonus}
                        </span>
                      )}
                    </div>
                    <span className="mt-2 text-xs font-bold text-zylo-purple">${pack.price.toFixed(2)} USD</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zylo-border">
              <div>
                <span className="text-[10px] font-bold text-zylo-muted">Selected</span>
                <p className="text-xs font-extrabold text-zylo-text">
                  {selectedPack.coins.toLocaleString()} Coins for ${selectedPack.price.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartPayment}
                className="rounded-xl bg-[#B8FF3D] px-5 py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Confirm Payment */}
        {step === 'CONFIRM' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/50 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-zylo-border pb-2.5">
                <span className="text-xs font-bold text-zylo-secondary">Package</span>
                <span className="text-xs font-black text-zylo-text">+{selectedPack.coins.toLocaleString()} Coins</span>
              </div>
              <div className="flex justify-between items-center border-b border-zylo-border pb-2.5">
                <span className="text-xs font-bold text-zylo-secondary">Price</span>
                <span className="text-sm font-black text-zylo-purple">${selectedPack.price.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zylo-secondary">Payment Method</span>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-zylo-text">
                  <CreditCard className="h-4 w-4 text-zylo-purple" />
                  <span>{paymentMethod}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-zylo-muted bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Simulated Payment Mode: No real financial charges will be processed.</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zylo-border">
              <button
                type="button"
                onClick={() => setStep('SELECT')}
                className="flex items-center gap-1 rounded-xl border border-zylo-border bg-zylo-warm px-3.5 py-2 text-xs font-bold text-zylo-text hover:bg-zylo-soft"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={handlePayNow}
                className="rounded-xl bg-[#B8FF3D] px-6 py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-md"
              >
                Pay ${selectedPack.price.toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Processing State */}
        {step === 'PROCESSING' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-zylo-purple" />
            <div>
              <h3 className="text-sm font-black text-zylo-text">Processing Simulated Payment...</h3>
              <p className="mt-1 text-xs text-zylo-muted">Adding {selectedPack.coins.toLocaleString()} coins to your wallet</p>
            </div>
          </div>
        )}

        {/* STEP 4: Success State */}
        {step === 'SUCCESS' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zylo-text">Top Up Successful!</h3>
              <p className="mt-1 text-xs font-extrabold text-emerald-600">
                +{selectedPack.coins.toLocaleString()} Coins added to your account
              </p>
              {newBalance !== null && (
                <p className="mt-2 text-xs font-bold text-zylo-secondary">
                  Updated Balance: <span className="font-black text-zylo-text">{newBalance.toLocaleString()} Coins</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-zylo-purple py-3 text-xs font-black text-white hover:bg-[#6926d1] transition shadow-md"
            >
              Done
            </button>
          </div>
        )}

        {/* STEP 5: Failed State */}
        {step === 'FAILED' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-red-100 p-3 text-red-600">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-base font-black text-zylo-text">Payment Failed</h3>
              <p className="mt-1 text-xs font-semibold text-red-600">
                {errorMsg || 'Your simulated payment could not be processed.'}
              </p>
            </div>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zylo-border bg-zylo-warm py-2.5 text-xs font-bold text-zylo-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl bg-zylo-purple py-2.5 text-xs font-black text-white hover:bg-[#6926d1]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
