'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useGifts } from '@/lib/hooks/use-queries';
import { useWalletData } from '@/lib/hooks/use-wallet';

export default function GiftsCatalogPage() {
  const { data: giftsList = [], isLoading: loadingGifts, error: giftsError } = useGifts();
  const { wallet, isBalanceLoading } = useWalletData();

  const loading = loadingGifts || isBalanceLoading;
  const error = (giftsError as any)?.message || '';
  const balance = wallet.purchasedCoins;

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1140px] px-5 py-6 sm:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">
            Gift Catalog
          </h1>
          <p className="mt-1 text-sm font-medium text-zylo-secondary">
            Send gifts to creators live on stream to support their broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zylo-border bg-white px-4 py-2.5 shadow-xs">
          <span className="text-xs font-bold text-zylo-muted">Balance:</span>
          <span className="text-sm font-extrabold text-zylo-purple">✦ {balance}</span>
          <Link
            href="/wallet"
            className="rounded-xl bg-zylo-lime px-3 py-1 text-xs font-extrabold text-zylo-text hover:brightness-95 transition"
          >
            Top up
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Gifts Grid */}
      {giftsList.length === 0 ? (
        <div className="rounded-3xl border border-zylo-border bg-white p-8 text-center text-xs font-semibold text-zylo-secondary shadow-sm">
          No virtual gifts available.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {giftsList.map((gift) => (
            <div
              key={gift.id}
              className="flex flex-col items-center gap-2 rounded-3xl border border-zylo-border bg-white p-6 shadow-sm hover:border-zylo-purple/40 hover:shadow-md transition group"
            >
              <span className="text-5xl group-hover:scale-110 transition duration-200">
                {gift.emoji}
              </span>
              <h3 className="mt-2 text-base font-extrabold text-zylo-text">{gift.name}</h3>
              <span className="rounded-full bg-zylo-soft px-3 py-1 text-xs font-extrabold text-zylo-purple">
                ✦ {gift.price} coins
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
