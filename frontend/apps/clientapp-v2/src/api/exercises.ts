import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';
import type {ExerciseForce, ExerciseMechanics} from '@/api/trainingPlans';

// ── Muscle / Equipment ───────────────────────────────────────

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

// ── ClientExercise (full detail) ─────────────────────────────

export type ClientExercise = {
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

// ── List params ──────────────────────────────────────────────

export type ListClientExercisesParams = {
  limit?: number;
  muscle_ids?: string;
  offset?: number;
  search?: string;
};

export type ListClientExercisesFilters = {
  muscle_ids?: string;
  search?: string;
};

const PAGE_SIZE = 20;

// ── Endpoints ────────────────────────────────────────────────

export const clientExercisesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientExercise: build.query<ApiResponse<ClientExercise>, string>({
      query: (id) => `/v1/client/exercises/${id}`,
      providesTags: (_, __, id) => [{type: 'Exercise', id}],
    }),
    listClientExercises: build.query<ApiListResponse<ClientExercise>, ListClientExercisesParams | void>({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/client/exercises',
            }
          : '/v1/client/exercises',
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
    clientExercises: build.infiniteQuery<ApiListResponse<ClientExercise>, ListClientExercisesFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/client/exercises',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          ...(queryArg?.muscle_ids && {muscle_ids: queryArg.muscle_ids}),
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
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((page) =>
                page.data.map((exercise) => ({
                  type: 'Exercise' as const,
                  id: exercise.id,
                })),
              ),
              {type: 'Exercise' as const, id: 'LIST'},
            ]
          : [{type: 'Exercise' as const, id: 'LIST'}],
    }),
  }),
});

export const {useClientExercisesInfiniteQuery, useGetClientExerciseQuery, useListClientExercisesQuery} =
  clientExercisesApi;
