import { UseQueryResult } from '@tanstack/react-query';

export interface StandardCacheState<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isInitialLoading: boolean;
  isRefreshing: boolean;
  lastFetchedAt: number | null;
  error: Error | null;
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Maps a React Query UseQueryResult object to the standard project cache schema:
 * - isInitialLoading: true when no data exists yet and a fetch is in progress.
 * - isRefreshing: true when data already exists but background refetch is running.
 */
export function formatCacheState<T>(
  queryResult: UseQueryResult<T, any>,
  extraProps?: { hasMore?: boolean; cursor?: string | null }
): StandardCacheState<T> {
  const { data, isLoading, isFetching, status, error, dataUpdatedAt } = queryResult;
  const hasData = data !== undefined && data !== null;

  return {
    data: (data as T) ?? null,
    status: status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success',
    isInitialLoading: isLoading && !hasData,
    isRefreshing: isFetching && hasData,
    lastFetchedAt: dataUpdatedAt ? dataUpdatedAt : null,
    error: (error as Error) || null,
    hasMore: extraProps?.hasMore ?? false,
    cursor: extraProps?.cursor ?? null,
  };
}

// Global in-flight promise registry for simultaneous request deduplication
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Deduplicates simultaneous API requests across components.
 * If a request for the given key is currently running, subsequent callers receive the same Promise.
 */
export function dedupeRequest<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetchFn()
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}
