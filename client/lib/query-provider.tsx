'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache validity for SPA navigation
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevents re-fetching when navigating SPA if data is fresh
    },
    mutations: {
      retry: 0,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
