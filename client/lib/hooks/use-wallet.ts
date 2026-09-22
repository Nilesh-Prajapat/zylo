'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/lib/api';
import { dedupeRequest } from '@/lib/api/cache-utils';
import { socketClient } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { Wallet, WalletTransaction, CouponRedemption, UserRole } from '@/lib/types';

export const walletQueryKeys = {
  wallet: ['wallet'] as const,
  transactions: (filterType?: string) => ['wallet-transactions', { filterType }] as const,
  redemptions: ['wallet-redemptions'] as const,
};

export function useWalletData(filterType: string = 'ALL') {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Deduplicated Wallet Balance query
  const walletQuery = useQuery({
    queryKey: walletQueryKeys.wallet,
    queryFn: () => dedupeRequest('wallet-balance', () => walletApi.getWallet()),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Deduplicated Wallet Transactions query
  const transactionsQuery = useQuery({
    queryKey: walletQueryKeys.transactions(filterType),
    queryFn: () =>
      dedupeRequest(`wallet-transactions-${filterType}`, () =>
        walletApi.getTransactions({
          type: filterType === 'ALL' ? undefined : filterType,
        })
      ),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isCreator = user?.role === 'CREATOR';

  // Deduplicated Coupon Redemptions query (for creators)
  const redemptionsQuery = useQuery({
    queryKey: walletQueryKeys.redemptions,
    queryFn: () => dedupeRequest('wallet-redemptions', () => walletApi.getRedemptions()),
    enabled: !!user && isCreator,
    staleTime: 5 * 60 * 1000,
  });

  // Real-time socket listener for wallet balance & transaction events
  useEffect(() => {
    if (!user) return;

    socketClient.connect();

    const handleBalanceUpdated = (payload: { purchasedCoins?: number; creatorEarnings?: number }) => {
      queryClient.setQueryData(walletQueryKeys.wallet, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          wallet: {
            purchasedCoins: payload.purchasedCoins ?? old.wallet?.purchasedCoins ?? 0,
            creatorEarnings: payload.creatorEarnings ?? old.wallet?.creatorEarnings ?? 0,
          },
        };
      });
    };

    const handleTxCreated = (newTx: WalletTransaction) => {
      queryClient.setQueriesData({ queryKey: ['wallet-transactions'] }, (old: any) => {
        if (!old || !old.items) return old;
        if (old.items.some((t: WalletTransaction) => t.id === newTx.id)) return old;
        return {
          ...old,
          items: [newTx, ...old.items],
        };
      });
    };

    socketClient.on('wallet:balance_updated', handleBalanceUpdated);
    socketClient.on('wallet:transaction_created', handleTxCreated);

    return () => {
      socketClient.off('wallet:balance_updated', handleBalanceUpdated);
      socketClient.off('wallet:transaction_created', handleTxCreated);
    };
  }, [user, queryClient]);

  const wallet: Wallet = walletQuery.data?.wallet || { purchasedCoins: 0, creatorEarnings: 0 };
  const userRole: UserRole = walletQuery.data?.userRole || user?.role || 'NORMAL_USER';
  const transactions: WalletTransaction[] = transactionsQuery.data?.items || [];
  const redemptions: CouponRedemption[] = redemptionsQuery.data || [];

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-redemptions'] });
  };

  return {
    wallet,
    userRole,
    transactions,
    redemptions,
    isBalanceLoading: walletQuery.isLoading,
    isBalanceRefreshing: walletQuery.isFetching && !walletQuery.isLoading,
    isTransactionsLoading: transactionsQuery.isLoading,
    isTransactionsRefreshing: transactionsQuery.isFetching && !transactionsQuery.isLoading,
    error: (walletQuery.error as any)?.message || (transactionsQuery.error as any)?.message || '',
    invalidateWallet,
  };
}
