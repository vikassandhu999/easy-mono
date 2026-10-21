import {QueryClient} from '@tanstack/react-query';

export const snapshotAge = 7 * 24 * 60 * 60 * 1000;
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {retry: false, staleTime: 30_000, gcTime: snapshotAge},
    mutations: {retry: false, networkMode: 'always'},
  },
});
