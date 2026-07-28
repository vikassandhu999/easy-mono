import {QueryClient} from '@tanstack/react-query';
import {produce} from 'immer';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Matches the old RTK Query behavior: no automatic retries, no
      // focus-refetch (setupListeners was never wired), and a mounted screen
      // reuses cached data instead of refetching on every remount.
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

/**
 * Optimistically patch a cached entry with an immer recipe. No-op when the
 * entry isn't cached. Returns a token whose `undo()` restores the pre-patch
 * snapshot — the RQ replacement for RTK's `util.updateQueryData(...).undo()`.
 */
export function patchQueryData<T>(queryKey: readonly unknown[], recipe: (draft: T) => void): {undo: () => void} {
  const previous = queryClient.getQueryData<T>(queryKey);
  if (previous === undefined) {
    return {undo: () => undefined};
  }
  queryClient.setQueryData<T>(queryKey, produce(previous, recipe));
  return {undo: () => queryClient.setQueryData<T>(queryKey, previous)};
}
