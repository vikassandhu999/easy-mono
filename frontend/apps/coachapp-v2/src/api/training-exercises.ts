/**
 * Hand-written infinite query for /v1/coach/training-exercises.
 *
 * Codegen cannot emit `build.infiniteQuery`, so this mirrors the pattern from
 * `src/api/exercises.ts` (the existing infiniteQuery for the global exercise
 * library) but targets the coach-scoped endpoint with the generated
 * `TrainingExercise` / `TrainingExerciseListResponse` / `ListCoachExercisesApiArg`
 * types from `generated.ts` so the hand-written query stays type-synced.
 */
import {api} from '@/api/base';
import {
  type CreateExerciseApiArg,
  type CreateExerciseApiResponse,
  coachApi,
  type ListCoachExercisesApiArg,
  type TrainingExerciseListResponse,
} from '@/api/generated';
import {pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachTrainingExercisesFilters = Pick<ListCoachExercisesApiArg, 'search' | 'muscleIds' | 'equipmentIds'>;

const trainingExercisesApi = api.injectEndpoints({
  endpoints: (build) => ({
    coachTrainingExercises: build.infiniteQuery<
      TrainingExerciseListResponse,
      CoachTrainingExercisesFilters | void,
      number
    >({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/training-exercises',
        params: {
          ...(queryArg?.search ? {search: queryArg.search} : {}),
          ...(queryArg?.muscleIds?.length ? {muscle_ids: queryArg.muscleIds.join(',')} : {}),
          ...(queryArg?.equipmentIds?.length ? {equipment_ids: queryArg.equipmentIds.join(',')} : {}),
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
      // result is InfiniteData<TrainingExerciseListResponse> | undefined.
      // pageTags expects {pages: {data: {id: string}[]}[]} which matches the
      // InfiniteData shape directly because TrainingExerciseListResponse has
      // a `data` field of TrainingExercise[].
      providesTags: (result) => pageTags('TrainingExercise', result as {pages: {data: {id: string}[]}[]} | undefined),
    }),

    /**
     * Create a custom coach training exercise.
     * The generated `useCreateExerciseMutation` posts to the same endpoint, but
     * we re-add it here so callers can import everything from one module.
     * If generated types drift, this endpoint will catch it at the `CreateExerciseApiArg`
     * boundary rather than silently mis-typing.
     */
    createCoachTrainingExercise: build.mutation<CreateExerciseApiResponse, CreateExerciseApiArg>({
      query: ({trainingExerciseCreateRequest}) => ({
        url: '/v1/coach/training-exercises',
        method: 'POST',
        body: trainingExerciseCreateRequest,
      }),
      invalidatesTags: [{type: 'TrainingExercise', id: 'LIST'}],
    }),
  }),
});

export const {useCoachTrainingExercisesInfiniteQuery, useCreateCoachTrainingExerciseMutation} = trainingExercisesApi;

// The generated getExercise/updateExercise are tag:false. Editing happens on a
// separate page that navigates back to the detail (and list) on save, so without
// cache coherence both show stale data. Wire the detail<->list tags here.
coachApi.enhanceEndpoints({
  endpoints: {
    getExercise: {providesTags: (_r, _e, {id}) => [{type: 'TrainingExercise', id}]},
    updateExercise: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'TrainingExercise', id},
        {type: 'TrainingExercise', id: 'LIST'},
      ],
    },
  },
});
