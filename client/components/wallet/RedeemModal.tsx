'use client';

import React, { useState } from 'react';
import { walletApi } from '@/lib/api';
import { X, Gift, Check, Copy, Loader2, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorEarnings: number;
  onSuccess?: () => void;
}

const COUPON_CATALOG = [
  { title: '$5 Creator Coupon', earningsDeducted: 1000, usdValue: 5.0 },
  { title: '$10 Creator Coupon', earningsDeducted: 2000, usdValue: 10.0 },
  { title: '$25 Creator Coupon', earningsDeducted: 5000, usdValue: 25.0 },
  { title: '$50 Creator Coupon', earningsDeducted: 10000, usdValue: 50.0 },
];

export function RedeemModal({ isOpen, onClose, creatorEarnings, onSuccess }: RedeemModalProps) {
  const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'REDEEMING' | 'SUCCESS' | 'FAILED'>('SELECT');
  const [selectedCoupon, setSelectedCoupon] = useState(COUPON_CATALOG[0]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectCoupon = (coupon: typeof COUPON_CATALOG[0]) => {
    if (creatorEarnings < coupon.earningsDeducted) return;
    setSelectedCoupon(coupon);
    setStep('CONFIRM');
  };

  const handleConfirmRedeem = async () => {
    setStep('REDEEMING');
    setErrorMsg(null);

    try {
      // Simulate fake processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await walletApi.redeem({
        couponTitle: selectedCoupon.title,
        earningsDeducted: selectedCoupon.earningsDeducted,
        usdValue: selectedCoupon.usdValue,
      });

      setGeneratedCode(res.redemption?.couponCode || 'ZYLO-REDEEM-OK');
      setStep('SUCCESS');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Redemption failed');
      setStep('FAILED');
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-zylo-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zylo-border pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-zylo-purple/10 p-2 text-zylo-purple">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zylo-text">Redeem Creator Earnings</h2>
              <p className="text-[11px] font-bold text-zylo-muted">
                Available: <span className="text-zylo-purple font-black">✦ {creatorEarnings.toLocaleString()} earnings</span>
              </p>
            </div>
          </div>
          {step !== 'REDEEMING' && (
            <button
              onClick={onClose}
              className="rounded-full bg-zylo-warm p-1.5 text-zylo-muted hover:text-zylo-text transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* STEP 1: Select Coupon */}
        {step === 'SELECT' && (
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-wider text-zylo-muted">
              Select Reward Coupon
            </label>

            <div className="space-y-2.5">
              {COUPON_CATALOG.map((coupon) => {
                const canAfford = creatorEarnings >= coupon.earningsDeducted;
                return (
                  <div
                    key={coupon.title}
                    onClick={() => canAfford && handleSelectCoupon(coupon)}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                      canAfford
                        ? 'border-zylo-border bg-white hover:border-zylo-purple cursor-pointer hover:bg-zylo-warm/40'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-black text-zylo-text">{coupon.title}</h4>
                      <p className="text-xs font-bold text-zylo-muted">
                        Cost: {coupon.earningsDeducted.toLocaleString()} earnings
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                        canAfford
                          ? 'bg-zylo-purple text-white hover:bg-[#6926d1]'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {canAfford ? 'Redeem' : 'Need More'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Confirm Redemption */}
        {step === 'CONFIRM' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zylo-border bg-zylo-warm/50 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-zylo-border pb-2.5">
                <span className="text-xs font-bold text-zylo-secondary">Reward</span>
                <span className="text-xs font-black text-zylo-text">{selectedCoupon.title}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zylo-border pb-2.5">
                <span className="text-xs font-bold text-zylo-secondary">Earnings Deducted</span>
                <span className="text-sm font-black text-zylo-purple">✦ {selectedCoupon.earningsDeducted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zylo-secondary">Remaining Earnings</span>
                <span className="text-xs font-extrabold text-zylo-text">
                  ✦ {(creatorEarnings - selectedCoupon.earningsDeducted).toLocaleString()}
                </span>
              </div>
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
                onClick={handleConfirmRedeem}
                className="rounded-xl bg-zylo-purple px-5 py-2.5 text-xs font-black text-white hover:bg-[#6926d1] transition shadow-md"
              >
                Confirm Redemption
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Redeeming Progress */}
        {step === 'REDEEMING' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-zylo-purple" />
            <div>
              <h3 className="text-sm font-black text-zylo-text">Redeeming Earnings...</h3>
              <p className="mt-1 text-xs text-zylo-muted">Generating coupon code for {selectedCoupon.title}</p>
            </div>
          </div>
        )}

        {/* STEP 4: Success State with Coupon Code */}
        {step === 'SUCCESS' && (
          <div className="py-2 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-[#B8FF3D]/30 p-3 text-black">
              <Sparkles className="h-8 w-8 text-zylo-purple" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zylo-text">Redemption Successful!</h3>
              <p className="mt-1 text-xs font-semibold text-zylo-secondary">
                {selectedCoupon.title} code generated:
              </p>
            </div>

            {/* Copyable Code Box */}
            <div className="w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-zylo-purple bg-zylo-soft/50 p-4">
              <span className="text-base font-black tracking-widest font-mono text-zylo-purple">
                {generatedCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 rounded-xl bg-zylo-purple px-3 py-1.5 text-xs font-bold text-white hover:bg-[#6926d1] transition"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
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
              <h3 className="text-base font-black text-zylo-text">Redemption Failed</h3>
              <p className="mt-1 text-xs font-semibold text-red-600">
                {errorMsg || 'Your creator earnings were not deducted.'}
              </p>
            </div>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zylo-border bg-zylo-warm py-2.5 text-xs font-bold text-zylo-text"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setStep('SELECT')}
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
