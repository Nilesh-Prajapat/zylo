'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Gem,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Loader2,
  Sparkles,
  Gift,
  Copy,
  Check,
  CreditCard,
  Tag,
  Filter,
} from 'lucide-react';
import { walletApi } from '@/lib/api';
import { Wallet, WalletTransaction, CouponRedemption, UserRole, WalletTransactionType } from '@/lib/types';
import { TopUpModal } from '@/components/wallet/TopUpModal';
import { RedeemModal } from '@/components/wallet/RedeemModal';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet>({ purchasedCoins: 0, creatorEarnings: 0 });
  const [userRole, setUserRole] = useState<UserRole>('NORMAL_USER');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'COUPONS'>('TRANSACTIONS');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await walletApi.getWallet();
      setWallet(data.wallet || { purchasedCoins: 0, creatorEarnings: 0 });
      setUserRole(data.userRole || 'NORMAL_USER');

      const txRes = await walletApi.getTransactions({
        type: filterType === 'ALL' ? undefined : filterType,
      });
      setTransactions(txRes.items || []);

      if (data.userRole === 'CREATOR') {
        const couponList = await walletApi.getRedemptions();
        setRedemptions(couponList);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isCreator = userRole === 'CREATOR';

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zylo-purple" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-8 select-none space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zylo-text">
          Zylo Wallet
        </h1>
        <p className="mt-1 text-sm font-medium text-zylo-secondary">
          Manage your personal coin balance, creator gift earnings, and transaction log.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Balances Grid */}
      <div className={`grid gap-5 ${isCreator ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Card 1: My Coins (Personal/Purchased) */}
        <div className="flex flex-col justify-between rounded-3xl border border-zylo-border bg-gradient-to-br from-white via-zylo-warm/40 to-[#f4ffd6]/40 p-6 shadow-xs space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zylo-purple flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5" /> My Coins
              </span>
              <span className="rounded-full bg-zylo-soft px-2.5 py-0.5 text-[10px] font-black text-zylo-purple">
                Purchased
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-zylo-text">
                ✦ {wallet.purchasedCoins.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-zylo-muted">coins</span>
            </div>
            <p className="mt-2 text-xs text-zylo-secondary leading-relaxed">
              Coins available to support creators with virtual gifts during live broadcasts.
            </p>
          </div>

          <button
            onClick={() => setShowTopUpModal(true)}
            className="w-full rounded-2xl bg-[#B8FF3D] py-3.5 text-xs font-black text-black hover:bg-[#a6fa26] transition shadow-xs cursor-pointer text-center"
          >
            + Top Up Coins
          </button>
        </div>

        {/* Card 2: Creator Earnings (Only shown for CREATOR) */}
        {isCreator && (
          <div className="flex flex-col justify-between rounded-3xl border border-zylo-border bg-gradient-to-br from-white via-zylo-soft/30 to-[#f3eeff] p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zylo-purple flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Creator Earnings
                </span>
                <span className="rounded-full bg-[#B8FF3D]/30 px-2.5 py-0.5 text-[10px] font-black text-black">
                  Earned from Gifts
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-zylo-purple">
                  ✦ {wallet.creatorEarnings.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-zylo-muted">earnings</span>
              </div>
              <p className="mt-2 text-xs text-zylo-secondary leading-relaxed">
                Gift value received from live stream viewers. Redeemable for reward coupons.
              </p>
            </div>

            <button
              onClick={() => setShowRedeemModal(true)}
              className="w-full rounded-2xl bg-zylo-purple py-3.5 text-xs font-black text-white hover:bg-[#6926d1] transition shadow-xs cursor-pointer text-center"
            >
              Redeem Earnings
            </button>
          </div>
        )}
      </div>

      {/* Tabs & History Section */}
      <section className="pt-4">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zylo-border pb-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-zylo-soft text-zylo-purple'
                  : 'text-zylo-secondary hover:bg-zylo-warm'
              }`}
            >
              <History className="h-4 w-4" /> Transactions
            </button>
            {isCreator && (
              <button
                onClick={() => setActiveTab('COUPONS')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeTab === 'COUPONS'
                    ? 'bg-zylo-soft text-zylo-purple'
                    : 'text-zylo-secondary hover:bg-zylo-warm'
                }`}
              >
                <Tag className="h-4 w-4" /> Redeemed Coupons ({redemptions.length})
              </button>
            )}
          </div>

          {/* Filter Pills for Transactions */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[10px] font-black uppercase text-zylo-muted mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'TOP_UP', label: 'Top Ups' },
                { id: 'GIFT_SENT', label: 'Gifts Sent' },
                { id: 'GIFT_RECEIVED', label: 'Gifts Received' },
                { id: 'REDEMPTION', label: 'Redemptions' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterType(id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                    filterType === id
                      ? 'bg-zylo-purple text-white'
                      : 'bg-zylo-warm text-zylo-secondary hover:bg-zylo-soft'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Transactions List */}
        {activeTab === 'TRANSACTIONS' && (
          <div>
            {transactions.length === 0 ? (
              <div className="rounded-3xl border border-zylo-border bg-white p-8 text-center text-xs font-semibold text-zylo-secondary shadow-xs">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-zylo-border rounded-3xl border border-zylo-border bg-white shadow-xs overflow-hidden">
                {transactions.map((tx) => {
                  const isCredit = tx.direction === 'CREDIT';
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-zylo-warm/40 transition">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                            isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-zylo-purple/10 text-zylo-purple'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-zylo-text">
                              {tx.description || tx.type}
                            </span>
                            <span className="rounded-md bg-zylo-warm px-1.5 py-0.5 text-[9px] font-black uppercase text-zylo-muted">
                              {tx.balanceType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-zylo-muted">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-black ${isCredit ? 'text-emerald-600' : 'text-zylo-purple'}`}>
                          {isCredit ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Redeemed Coupons List */}
        {activeTab === 'COUPONS' && isCreator && (
          <div>
            {redemptions.length === 0 ? (
              <div className="rounded-3xl border border-zylo-border bg-white p-8 text-center text-xs font-semibold text-zylo-secondary shadow-xs">
                No coupons redeemed yet. Earn gift credits and redeem them above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {redemptions.map((red) => (
                  <div key={red.id} className="rounded-3xl border border-zylo-border bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zylo-purple">Redeemed Reward</span>
                        <h4 className="text-sm font-black text-zylo-text">{red.couponTitle}</h4>
                        <p className="text-[10px] font-semibold text-zylo-muted">{new Date(red.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="rounded-xl bg-[#B8FF3D]/30 px-2.5 py-1 text-xs font-black text-black">
                        ${red.usdValue.toFixed(2)} Value
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-zylo-warm p-3 border border-zylo-border/60">
                      <span className="font-mono text-xs font-black text-zylo-purple tracking-widest">{red.couponCode}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(red.couponCode)}
                        className="flex items-center gap-1 rounded-lg bg-zylo-purple px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#6926d1] transition"
                      >
                        {copiedCode === red.couponCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode === red.couponCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modals */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={fetchWalletData}
      />

      <RedeemModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        creatorEarnings={wallet.creatorEarnings}
        onSuccess={fetchWalletData}
      />
    </div>
  );
}
