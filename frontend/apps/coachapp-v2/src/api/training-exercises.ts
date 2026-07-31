/**
 * Every hook the coach-scoped exercise library needs: the hand-written
 * infinite list for `/v1/coach/training-exercises` (React Query has no
 * infinite-query codegen, same reason the old RTK slice hand-wrote it), plus
 * get/create/update/delete/copy for one exercise and the muscle/equipment
 * reference lists the exercise form and the builder's picker filter by.
 *
 * `getExercise`/`updateExercise` used to be generated with no cache tags, and
 * a hand-rolled `enhanceEndpoints` block wired detail<->list invalidation on
 * top. There's no separate generated layer to enhance anymore, so that wiring
 * is just written directly into the mutations below.
 */
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {equipmentKeys, exerciseKeys, muscleKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

const PAGE_SIZE = 20;

export type TrainingExercise = components['schemas']['TrainingExercise'];
export type TrainingExerciseRelation = components['schemas']['TrainingExerciseRelation'];
export type TrainingExerciseCreateRequest = components['schemas']['TrainingExerciseCreateRequest'];
export type TrainingExerciseUpdateRequest = components['schemas']['TrainingExerciseUpdateRequest'];
export type TrainingExerciseCopyRequest = components['schemas']['TrainingExerciseCopyRequest'];
export type TrainingExerciseListResponse = components['schemas']['TrainingExerciseListResponse'];

type ListCoachExercisesQuery = NonNullable<paths['/v1/coach/training-exercises']['get']['parameters']['query']>;

/** Filter params — offset/limit are handled by the infinite query machinery. */
export type CoachTrainingExercisesFilters = {
  search?: string;
  muscleIds?: string[];
  equipmentIds?: string[];
};

export function useCoachTrainingExercisesInfiniteQuery(filters?: CoachTrainingExercisesFilters) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.infinite(filters),
    queryFn: ({pageParam}) =>
      call(
        client.GET('/v1/coach/training-exercises', {
          params: {
            query: {
              ...(filters?.search ? {search: filters.search} : {}),
              // The backend takes one comma-joined id list per filter, not a
              // repeated query key — openapi-fetch's default array serializer
              // repeats the key, so join by hand (mirrors the old RTK query,
              // which did the same before handing params to fetchBaseQuery).
              ...(filters?.muscleIds?.length ? {muscle_ids: filters.muscleIds.join(',')} : {}),
              ...(filters?.equipmentIds?.length ? {equipment_ids: filters.equipmentIds.join(',')} : {}),
              offset: pageParam,
              limit: PAGE_SIZE,
            } as ListCoachExercisesQuery,
          },
        }),
      ) as Promise<TrainingExerciseListResponse>,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam + PAGE_SIZE;
      return nextOffset < lastPage.count ? nextOffset : undefined;
    },
  });
}

export function useCreateCoachTrainingExerciseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TrainingExerciseCreateRequest) => call(client.POST('/v1/coach/training-exercises', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: exerciseKeys.lists()});
    },
  });
}

export function useGetExerciseQuery(id: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: exerciseKeys.detail(id),
    queryFn: () => call(client.GET('/v1/coach/training-exercises/{id}', {params: {path: {id}}})),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateExerciseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingExerciseUpdateRequest}) =>
      call(client.PATCH('/v1/coach/training-exercises/{id}', {params: {path: {id}}, body})),
    onSuccess: (_data, {id}) => {
      qc.invalidateQueries({queryKey: exerciseKeys.detail(id)});
      qc.invalidateQueries({queryKey: exerciseKeys.lists()});
    },
  });
}

/**
 * The generated `deleteExercise`/`copyExercise` used to be tag:false, with the
 * exercise-detail screen invalidating the list tag by hand after each call.
 * Baking the invalidation into the mutation itself (like every other domain
 * file) means every future caller gets cache coherence for free.
 */
export function useDeleteExerciseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/coach/training-exercises/{id}', {params: {path: {id}}})),
    onSuccess: (_data, id) => {
      qc.removeQueries({queryKey: exerciseKeys.detail(id)});
      qc.invalidateQueries({queryKey: exerciseKeys.lists()});
    },
  });
}

export function useCopyExerciseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, body}: {id: string; body: TrainingExerciseCopyRequest}) =>
      call(client.POST('/v1/coach/training-exercises/{id}/copy', {params: {path: {id}}, body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: exerciseKeys.lists()});
    },
  });
}

export function useListMusclesQuery(params?: {search?: string}) {
  return useQuery({
    queryKey: muscleKeys.all,
    queryFn: () => call(client.GET('/v1/coach/training-muscles', {params: {query: params ?? undefined}})),
  });
}

export function useListEquipmentQuery(params?: {search?: string}) {
  return useQuery({
    queryKey: equipmentKeys.all,
    queryFn: () => call(client.GET('/v1/coach/training-equipment', {params: {query: params ?? undefined}})),
  });
}
