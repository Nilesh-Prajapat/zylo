'use client';

import React, { useState, useEffect } from 'react';
import { walletApi } from '@/lib/api';
import { X, Gem, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PACKAGES = [
  { coins: 100, priceInr: 10, label: '100 Credits', bonus: '' },
  { coins: 500, priceInr: 50, label: '500 Credits', bonus: '+50 Bonus' },
  { coins: 1000, priceInr: 100, label: '1,000 Credits', bonus: '+150 Bonus' },
  { coins: 5000, priceInr: 500, label: '5,000 Credits', bonus: '+1,000 Bonus' },
];

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('SELECT');
  const [selectedPack, setSelectedPack] = useState(PACKAGES[2]); // default ₹100
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Razorpay) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!isOpen) return null;

  const handleStartRazorpay = async () => {
    setLoadingOrder(true);
    setErrorMsg(null);

    try {
      // 1. Create order on backend API
      const orderRes = await walletApi.createTopupOrder(selectedPack.priceInr);

      // Check if Razorpay SDK loaded
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        // Retry dynamically loading script if needed
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
          document.body.appendChild(script);
        });
      }

      // 2. Configure Razorpay Options
      const options = {
        key: orderRes.keyId || 'rzp_test_TfChcyTibFslfx',
        amount: Math.round(orderRes.amountInr * 100),
        currency: orderRes.currency || 'INR',
        name: 'Zylo Live',
        description: `Top up ${orderRes.credits.toLocaleString()} Credits`,
        order_id: orderRes.orderId,
        handler: async function (response: any) {
          setStep('PROCESSING');
          try {
            // 3. Server-side API verification of Razorpay signature
            const verifyRes = await walletApi.verifyTopup({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              topup_id: orderRes.topupId,
            });

            setNewBalance(verifyRes.wallet?.purchasedCoins ?? null);
            setStep('SUCCESS');
            if (onSuccess) onSuccess();
          } catch (err: any) {
            setErrorMsg(err.response?.data?.error?.message || err.message || 'Payment verification failed');
            setStep('FAILED');
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingOrder(false);
          },
        },
        theme: {
          color: '#8B5CF6',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Failed to initiate Razorpay order.');
      setStep('FAILED');
    } finally {
      setLoadingOrder(false);
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
              <h2 className="text-base font-extrabold text-zylo-text">Top Up Credits</h2>
              <p className="text-[11px] font-bold text-zylo-muted">Razorpay Test Mode Integration</p>
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
              Select Credit Package
            </label>

            <div className="grid grid-cols-2 gap-3">
              {PACKAGES.map((pack) => {
                const isSelected = selectedPack.priceInr === pack.priceInr;
                return (
                  <button
                    key={pack.priceInr}
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
                    <span className="mt-2 text-xs font-bold text-zylo-purple">₹{pack.priceInr} INR</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zylo-border">
              <div>
                <span className="text-[10px] font-bold text-zylo-muted">Selected</span>
                <p className="text-xs font-extrabold text-zylo-text">
                  {selectedPack.coins.toLocaleString()} Credits for ₹{selectedPack.priceInr}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartRazorpay}
                disabled={loadingOrder}
                className="flex items-center gap-2 rounded-xl bg-[#B8FF3D] px-5 py-2.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs disabled:opacity-50"
              >
                {loadingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Pay ₹{selectedPack.priceInr} →</span>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Processing State */}
        {step === 'PROCESSING' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-zylo-purple" />
            <div>
              <h3 className="text-sm font-black text-zylo-text">Verifying Payment Signature...</h3>
              <p className="mt-1 text-xs text-zylo-muted">Server is validating your Razorpay transaction</p>
            </div>
          </div>
        )}

        {/* STEP 3: Success State */}
        {step === 'SUCCESS' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zylo-text">Top Up Successful!</h3>
              <p className="mt-1 text-xs font-extrabold text-emerald-600">
                +{selectedPack.coins.toLocaleString()} Credits added to your account
              </p>
              {newBalance !== null && (
                <p className="mt-2 text-xs font-bold text-zylo-secondary">
                  Updated Balance: <span className="font-black text-zylo-text">✦ {newBalance.toLocaleString()} Credits</span>
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

        {/* STEP 4: Failed State */}
        {step === 'FAILED' && (
          <div className="py-4 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-red-100 p-3 text-red-600">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-base font-black text-zylo-text">Payment Verification Failed</h3>
              <p className="mt-1 text-xs font-semibold text-red-600">
                {errorMsg || 'Your Razorpay payment signature could not be verified.'}
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
