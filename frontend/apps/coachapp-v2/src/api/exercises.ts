import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, listTags, pageTags} from '@/api/shared';

const PAGE_SIZE = 20;

export type ExerciseMechanics = 'compound' | 'isolation' | 'isometric';
export type ExerciseForce = 'pull' | 'push' | 'static';

export type Muscle = {
  description: null | string;
  id: string;
  name: string;
};

export type Equipment = {
  description: null | string;
  id: string;
  name: string;
};

export type Exercise = {
  business_id: null | string;
  description: null | string;
  equipment: Equipment[];
  force: ExerciseForce | null;
  id: string;
  images: string[];
  inserted_at: string;
  instructions: null | string;
  mechanics: ExerciseMechanics | null;
  muscles: Muscle[];
  name: string;
  updated_at: string;
};

export type ListExercisesParams = {
  limit?: number;
  muscle_ids?: string[];
  offset?: number;
  search?: string;
};

/** Filter params for infinite query — no offset/limit (pagination handled by infiniteQuery) */
export type ListExercisesFilters = {
  muscle_ids?: string[];
  search?: string;
};

export type ExerciseCreateRequest = {
  description?: string;
  equipment_ids?: string[];
  force?: ExerciseForce;
  images?: string[];
  instructions?: string;
  mechanics?: ExerciseMechanics;
  muscle_ids?: string[];
  name: string;
};

export type ExerciseUpdateRequest = Partial<ExerciseCreateRequest>;

export const exercisesApi = api.injectEndpoints({
  endpoints: (build) => ({
    createExercise: build.mutation<ApiResponse<Exercise>, ExerciseCreateRequest>({
      query: (body) => ({
        url: '/v1/coach/exercises',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{type: 'Exercise', id: 'LIST'}],
    }),
    getExercise: build.query<ApiResponse<Exercise>, string>({
      query: (id) => `/v1/coach/exercises/${id}`,
      providesTags: (_, __, id) => [{type: 'Exercise', id}],
    }),
    listExercises: build.query<ApiListResponse<Exercise>, ListExercisesParams | void>({
      query: (params) => ({
        url: '/v1/coach/exercises',
        params: params
          ? {...params, muscle_ids: params.muscle_ids?.length ? params.muscle_ids.join(',') : undefined}
          : undefined,
      }),
      providesTags: (result) => listTags('Exercise', result),
    }),
    exercises: build.infiniteQuery<ApiListResponse<Exercise>, ListExercisesFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/exercises',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          ...(queryArg?.muscle_ids?.length && {
            muscle_ids: queryArg.muscle_ids.join(','),
          }),
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
      providesTags: (result) => pageTags('Exercise', result),
    }),
    updateExercise: build.mutation<ApiResponse<Exercise>, {body: ExerciseUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        url: `/v1/coach/exercises/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'Exercise', id},
        {type: 'Exercise', id: 'LIST'},
      ],
    }),
    deleteExercise: build.mutation<void, string>({
      query: (id) => ({
        url: `/v1/coach/exercises/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Exercise', id},
        {type: 'Exercise', id: 'LIST'},
      ],
    }),
    duplicateExercise: build.mutation<ApiResponse<Exercise>, string>({
      query: (id) => ({
        url: `/v1/coach/exercises/${id}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'Exercise', id},
        {type: 'Exercise', id: 'LIST'},
      ],
    }),
    listMuscles: build.query<ApiResponse<Muscle[]>, undefined | {search?: string}>({
      query: (params) => ({url: '/v1/coach/muscles', params}),
      providesTags: [{type: 'Muscle', id: 'LIST'}],
    }),
    listEquipment: build.query<ApiResponse<Equipment[]>, undefined | {search?: string}>({
      query: (params) => ({url: '/v1/coach/equipment', params}),
      providesTags: [{type: 'Equipment', id: 'LIST'}],
    }),
  }),
});

export const {
  useCreateExerciseMutation,
  useDeleteExerciseMutation,
  useDuplicateExerciseMutation,
  useExercisesInfiniteQuery,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListExercisesQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} = exercisesApi;
