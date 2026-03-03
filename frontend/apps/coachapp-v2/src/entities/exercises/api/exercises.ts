import {api} from '@/api';
import {ApiListResponse, ApiResponse} from '@/shared/api/shared';

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

export type ExerciseUpdateRequest = {
  description?: string;
  equipment_ids?: string[];
  force?: ExerciseForce;
  images?: string[];
  instructions?: string;
  mechanics?: ExerciseMechanics;
  muscle_ids?: string[];
  name?: string;
};

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
      query: (params) => {
        if (!params) {
          return '/v1/coach/exercises';
        }

        return {
          url: '/v1/coach/exercises',
          params: {
            ...params,
            muscle_ids: params.muscle_ids?.length ? params.muscle_ids.join(',') : undefined,
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((exercise) => ({
                type: 'Exercise' as const,
                id: exercise.id,
              })),
              {type: 'Exercise' as const, id: 'LIST'},
            ]
          : [{type: 'Exercise' as const, id: 'LIST'}],
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
    listMuscles: build.query<ApiResponse<Muscle[]>, void | {search?: string}>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/muscles',
              params,
            }
          : '/v1/coach/muscles',
      providesTags: [{type: 'Muscle', id: 'LIST'}],
    }),
    listEquipment: build.query<ApiResponse<Equipment[]>, void | {search?: string}>({
      query: (params) =>
        params
          ? {
              url: '/v1/coach/equipment',
              params,
            }
          : '/v1/coach/equipment',
      providesTags: [{type: 'Equipment', id: 'LIST'}],
    }),
  }),
});

export const {
  useCreateExerciseMutation,
  useDeleteExerciseMutation,
  useDuplicateExerciseMutation,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListExercisesQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} = exercisesApi;
