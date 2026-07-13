/**
 * Hand-written infinite query for `GET /v1/coach/training-plans`.
 *
 * Codegen cannot emit `build.infiniteQuery`, so this mirrors the pattern from
 * `src/api/nutrition-plans-list.ts` (offset pagination, page size 20,
 * `pageTags`) but targets the coach-scoped training-plans list with the
 * generated `TrainingPlanListResponse` / `ListTrainingPlansApiArg` types from
 * `generated.ts` so the hand-written query stays type-synced.
 *
 * The generated slice already provides `useGetTrainingPlanQuery`,
 * `useCreateTrainingPlanMutation`, `useUpdateTrainingPlanMutation`, etc.
 * Only the infinite list is missing, so this module supplies just that.
 */
import {api} from '@/api/base';
import {coachApi, type ListTrainingPlansApiArg, type TrainingPlanListResponse} from '@/api/generated';
import {pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachTrainingPlansFilters = Pick<ListTrainingPlansApiArg, 'status'> & {
  search?: string;
};

const trainingPlansListApi = api.injectEndpoints({
  endpoints: (build) => ({
    coachTrainingPlans: build.infiniteQuery<TrainingPlanListResponse, CoachTrainingPlansFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/training-plans',
        params: {
          ...(queryArg?.search ? {search: queryArg.search} : {}),
          ...(queryArg?.status ? {status: queryArg.status} : {}),
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
      // result is InfiniteData<TrainingPlanListResponse> | undefined; the
      // InfiniteData shape matches pageTags' expected {pages: {data: {id}[]}[]}
      // because TrainingPlanListResponse has a `data` field of TrainingPlan[].
      providesTags: (result) => pageTags('TrainingPlan', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),
  }),
});

export const {useCoachTrainingPlansInfiniteQuery} = trainingPlansListApi;
export const {useListCoachClientTrainingPlansQuery, useListTrainingPlansQuery} = coachApi;

// The builder keeps its own detail (getTrainingPlan) fresh via optimistic
// updateQueryData, but nothing refreshes the plan LIST after a rename/status
// change — so the list shows stale names. updateTrainingPlan is tag:false;
// invalidate just the LIST tag (not the detail, which the builder owns).
coachApi.enhanceEndpoints({
  endpoints: {
    listTrainingPlans: {providesTags: [{type: 'TrainingPlan', id: 'LIST'}]},
    createTrainingPlan: {invalidatesTags: [{type: 'TrainingPlan', id: 'LIST'}]},
    updateTrainingPlan: {invalidatesTags: [{type: 'TrainingPlan', id: 'LIST'}]},
    // Duplicate is tag:false — invalidate the list so the copy shows on return.
    duplicateTrainingPlan: {invalidatesTags: [{type: 'TrainingPlan', id: 'LIST'}]},
    // The client's assigned-plans list + assign mutation are tag:false; wire a
    // shared CLIENT-LIST tag so assigning refreshes the list (and the stat strip).
    listCoachClientTrainingPlans: {providesTags: [{type: 'TrainingPlan', id: 'CLIENT-LIST'}]},
    assignTrainingPlan: {
      invalidatesTags: [
        {type: 'TrainingPlan', id: 'CLIENT-LIST'},
        {type: 'Client', id: 'LIST'},
      ],
    },
  },
});
