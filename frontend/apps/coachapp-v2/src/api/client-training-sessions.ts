/**
 * Hand-written infinite query for
 * `GET /v1/coach/clients/:client_id/training-sessions`.
 *
 * Codegen cannot emit `build.infiniteQuery`, so this mirrors the pattern from
 * `src/api/nutrition-plans-list.ts` (offset pagination, page size 20,
 * `pageTags`) but targets the client-scoped training-sessions list with the
 * generated `TrainingSessionListResponse` / `ListCoachClientTrainingSessionsApiArg`
 * types from `generated.ts` so the hand-written query stays type-synced.
 *
 * NOTE: `clientId` is a REQUIRED path field (not an optional filter), so the
 * infinite query arg is non-void and always carries `clientId`.
 *
 * The generated slice already provides `useGetCoachClientTrainingSessionQuery`
 * and the non-infinite `useListCoachClientTrainingSessionsQuery`. Only the
 * infinite list is missing, so this module supplies just that.
 */
import {api} from '@/api/base';
import type {ListCoachClientTrainingSessionsApiArg, TrainingSessionListResponse} from '@/api/generated';
import {pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

/** Arg for the infinite session list — `clientId` is required; `from`/`to` are optional date filters. */
export type CoachClientTrainingSessionsArg = Pick<ListCoachClientTrainingSessionsApiArg, 'clientId' | 'from' | 'to'>;

export const clientTrainingSessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    coachClientTrainingSessions: build.infiniteQuery<
      TrainingSessionListResponse,
      CoachClientTrainingSessionsArg,
      number
    >({
      query: ({queryArg, pageParam}) => ({
        url: `/v1/coach/clients/${queryArg.clientId}/training-sessions`,
        params: {
          ...(queryArg.from ? {from: queryArg.from} : {}),
          ...(queryArg.to ? {to: queryArg.to} : {}),
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      }),
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const nextOffset = lastPageParam + PAGE_SIZE;
          return nextOffset < lastPage.count ? nextOffset : undefined;
        },
      },
      // result is InfiniteData<TrainingSessionListResponse> | undefined; the
      // InfiniteData shape matches pageTags' expected {pages: {data: {id}[]}[]}.
      providesTags: (result) => pageTags('TrainingSession', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),
  }),
});

export const {useCoachClientTrainingSessionsInfiniteQuery} = clientTrainingSessionsApi;
