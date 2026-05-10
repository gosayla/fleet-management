/**
 * useCachedFetch — stale-while-revalidate hook backed by AsyncStorage.
 *
 * Behaviour:
 *  1. On mount: immediately hydrate state from the local AsyncStorage cache
 *     (no loading spinner if a cached value exists).
 *  2. Always fetch fresh data from the network in the background.
 *  3. When fresh data arrives it replaces state and updates the cache.
 *  4. Pull-to-refresh sets `refreshing = true` so the caller can show a spinner.
 *
 * Usage:
 *   const { data, loading, refreshing, refresh } = useCachedFetch(
 *     'vehicles',
 *     () => api.get<VehicleCardData[]>('/vehicles'),
 *   );
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fc:';

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
) {
  const [data, setData] = useState<T | null>(null);
  /** true only on the very first load when there is no cached data yet */
  const [loading, setLoading] = useState(true);
  /** true during an explicit pull-to-refresh */
  const [refreshing, setRefreshing] = useState(false);

  const storageKey = `${PREFIX}${cacheKey}`;
  // Keep fetcher stable so the effect doesn't re-run on every render
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchFresh = useCallback(
    async (manual: boolean) => {
      if (manual) setRefreshing(true);
      try {
        const fresh = await fetcherRef.current();
        setData(fresh);
        setLoading(false);
        AsyncStorage.setItem(storageKey, JSON.stringify(fresh)).catch(() => {});
      } catch (err) {
        // network error — keep showing the cached data
        console.error(`[useCachedFetch] ${storageKey} failed:`, err);
        setLoading(false);
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [storageKey],
  );

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(storageKey)
      .then(cached => {
        if (cancelled) return;
        if (cached) {
          try {
            setData(JSON.parse(cached));
            setLoading(false);
          } catch {
            // corrupted cache — ignore and wait for network
          }
        }
        fetchFresh(false);
      })
      .catch(() => {
        if (!cancelled) fetchFresh(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const refresh = useCallback(() => fetchFresh(true), [fetchFresh]);

  return {data, loading, refreshing, refresh};
}
