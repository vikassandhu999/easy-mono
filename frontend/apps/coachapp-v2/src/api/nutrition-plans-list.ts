/**
 * Hand-written infinite query for `GET /v1/coach/nutrition-plans`.
 *
 * Codegen cannot emit `build.infiniteQuery`, so this mirrors the pattern from
 * `src/api/nutrition-foods.ts` (offset pagination, page size 20, `pageTags`)
 * but targets the coach-scoped nutrition-plans list with the generated
 * `NutritionPlanListResponse` / `ListNutritionPlansApiArg` types from
 * `generated.ts` so the hand-written query stays type-synced.
 *
 * The generated slice already provides `useGetNutritionPlanQuery`,
 * `useCreateNutritionPlanMutation`, `useUpdateNutritionPlanMutation`, etc.
 * Only the infinite list is missing, so this module supplies just that.
 */
import {api} from '@/api/base';
import {coachApi, type ListNutritionPlansApiArg, type NutritionPlanListResponse} from '@/api/generated';
import {pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachNutritionPlansFilters = Pick<ListNutritionPlansApiArg, 'search' | 'status'>;

const nutritionPlansListApi = api.injectEndpoints({
  endpoints: (build) => ({
    coachNutritionPlans: build.infiniteQuery<NutritionPlanListResponse, CoachNutritionPlansFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/nutrition-plans',
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
      // result is InfiniteData<NutritionPlanListResponse> | undefined.
      // pageTags expects {pages: {data: {id: string}[]}[]} which matches the
      // InfiniteData shape directly because NutritionPlanListResponse has a
      // `data` field of NutritionPlan[].
      providesTags: (result) => pageTags('NutritionPlan', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),
  }),
});

export const {useCoachNutritionPlansInfiniteQuery} = nutritionPlansListApi;
export const {useListCoachClientNutritionPlansQuery, useListNutritionPlansQuery, useUpdateNutritionPlanMutation} =
  coachApi;

// The builder keeps its own detail (getNutritionPlan) fresh via optimistic
// updateQueryData, but nothing refreshes the plan LIST after a rename/status
// change — so the list shows stale names. updateNutritionPlan is tag:false;
// invalidate the LIST tag (not the detail, which the builder owns) plus
// CLIENT-LIST, since the client detail card edits macro targets through it.
coachApi.enhanceEndpoints({
  endpoints: {
    listNutritionPlans: {providesTags: [{type: 'NutritionPlan', id: 'LIST'}]},
    createNutritionPlan: {invalidatesTags: [{type: 'NutritionPlan', id: 'LIST'}]},
    updateNutritionPlan: {
      invalidatesTags: [
        {type: 'NutritionPlan', id: 'LIST'},
        {type: 'NutritionPlan', id: 'CLIENT-LIST'},
      ],
    },
    // Duplicate is tag:false — invalidate the list so the copy shows on return.
    duplicateNutritionPlan: {invalidatesTags: [{type: 'NutritionPlan', id: 'LIST'}]},
    deleteNutritionPlan: {invalidatesTags: [{type: 'NutritionPlan', id: 'LIST'}]},
    // The client's assigned-plans list + assign mutation are tag:false; wire a
    // shared CLIENT-LIST tag so assigning refreshes the list (and the stat strip).
    listCoachClientNutritionPlans: {providesTags: [{type: 'NutritionPlan', id: 'CLIENT-LIST'}]},
    assignNutritionPlan: {
      invalidatesTags: [
        {type: 'NutritionPlan', id: 'CLIENT-LIST'},
        {type: 'Client', id: 'LIST'},
      ],
    },
  },
});
