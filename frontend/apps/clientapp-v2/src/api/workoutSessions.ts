import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';
import type {ClientExerciseSummary, DistanceUnit, LoadUnit, SetType} from '@/api/trainingPlans';

// ── Enums ────────────────────────────────────────────────────

export type WorkoutSessionState = 'active' | 'completed' | 'discarded';

// ── Snapshot types (embedded in ClientWorkoutSession) ────────

export type PlannedSnapshotSet = {
  distance_unit: DistanceUnit | null;
  distance_value: null | string;
  duration_seconds: null | number;
  intensity_target: null | string;
  load_unit: LoadUnit | null;
  load_value: null | string;
  notes: null | string;
  rest_seconds: null | number;
  set_type: null | SetType;
  target_reps: null | string;
  tempo: null | string;
};

export type PlannedSnapshotElement = {
  element_id: string;
  exercise_id: string;
  exercise_name: string;
  notes: null | string;
  planned_sets: PlannedSnapshotSet[];
  position: number;
  superset_group_id: null | string;
};

export type PlannedSnapshot = {
  elements: PlannedSnapshotElement[];
  workout_name: string;
};

// ── ClientPerformedSet ───────────────────────────────────────
// Note: load_value, rpe, distance_value are strings (decimal-as-string from API)

export type ClientPerformedSet = {
  actual_reps: null | string;
  completed: boolean;
  distance_unit: DistanceUnit | null;
  distance_value: null | string;
  duration_seconds: null | number;
  exercise: ClientExerciseSummary;
  exercise_id: string;
  id: string;
  inserted_at: string;
  intensity_felt: null | string;
  load_unit: LoadUnit | null;
  load_value: null | string;
  notes: null | string;
  position: number;
  rir: null | number;
  rpe: null | string;
  tempo_actual: null | string;
  updated_at: string;
  workout_element_id: null | string;
  workout_session_id: string;
};

// ── ClientWorkoutSession ─────────────────────────────────────

export type ClientWorkoutSession = {
  ended_at: null | string;
  id: string;
  inserted_at: string;
  notes: null | string;
  performed_sets: ClientPerformedSet[];
  planned_snapshot: null | PlannedSnapshot;
  workout_id: null | string;
  soreness_rating: null | number;
  started_at: string;
  state: WorkoutSessionState;
  updated_at: string;
};

// ── Request types ────────────────────────────────────────────

export type ClientStartSessionRequest = {
  notes?: null | string;
  workout_id?: null | string;
};

export type ClientUpdateSessionRequest = {
  notes?: null | string;
  soreness_rating?: null | number;
};

export type ClientCompleteSessionRequest = {
  notes?: null | string;
  soreness_rating?: null | number;
};

export type ClientLogSetRequest = {
  actual_reps?: null | string;
  completed?: boolean;
  distance_unit?: DistanceUnit;
  distance_value?: null | number;
  duration_seconds?: null | number;
  exercise_id: string;
  intensity_felt?: null | string;
  load_unit?: LoadUnit;
  load_value?: null | number;
  notes?: null | string;
  position: number;
  rir?: null | number;
  rpe?: null | number;
  tempo_actual?: null | string;
  workout_element_id?: null | string;
  workout_session_id: string;
};

export type ClientUpdateSetRequest = {
  actual_reps?: null | string;
  completed?: boolean;
  distance_unit?: DistanceUnit;
  distance_value?: null | number;
  duration_seconds?: null | number;
  intensity_felt?: null | string;
  load_unit?: LoadUnit;
  load_value?: null | number;
  notes?: null | string;
  rir?: null | number;
  rpe?: null | number;
  tempo_actual?: null | string;
};

// ── List params ──────────────────────────────────────────────

export type ListClientWorkoutSessionsParams = {
  limit?: number;
  offset?: number;
  state?: WorkoutSessionState;
};

export type ListClientWorkoutSessionsFilters = {
  state?: WorkoutSessionState;
};

const PAGE_SIZE = 20;

// ── Endpoints ────────────────────────────────────────────────

export const clientWorkoutSessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    startWorkoutSession: build.mutation<ApiResponse<ClientWorkoutSession>, ClientStartSessionRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/workout_sessions',
      }),
      invalidatesTags: [{type: 'WorkoutSession', id: 'LIST'}],
    }),
    listClientWorkoutSessions: build.query<
      ApiListResponse<ClientWorkoutSession>,
      ListClientWorkoutSessionsParams | void
    >({
      query: (params) => ({url: '/v1/client/workout_sessions', params}),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((session) => ({
                type: 'WorkoutSession' as const,
                id: session.id,
              })),
              {type: 'WorkoutSession' as const, id: 'LIST'},
            ]
          : [{type: 'WorkoutSession' as const, id: 'LIST'}],
    }),
    clientWorkoutSessions: build.infiniteQuery<
      ApiListResponse<ClientWorkoutSession>,
      ListClientWorkoutSessionsFilters | void,
      number
    >({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/client/workout_sessions',
        params: {
          ...(queryArg?.state && {state: queryArg.state}),
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
                page.data.map((session) => ({
                  type: 'WorkoutSession' as const,
                  id: session.id,
                })),
              ),
              {type: 'WorkoutSession' as const, id: 'LIST'},
            ]
          : [{type: 'WorkoutSession' as const, id: 'LIST'}],
    }),
    getActiveWorkoutSession: build.query<ApiResponse<ClientWorkoutSession>, void>({
      query: () => '/v1/client/workout_sessions/active',
      providesTags: (result) =>
        result ? [{type: 'WorkoutSession', id: result.data.id}] : [{type: 'WorkoutSession', id: 'ACTIVE'}],
    }),
    getClientWorkoutSession: build.query<ApiResponse<ClientWorkoutSession>, string>({
      query: (id) => `/v1/client/workout_sessions/${id}`,
      providesTags: (_, __, id) => [{type: 'WorkoutSession', id}],
    }),
    updateClientWorkoutSession: build.mutation<
      ApiResponse<ClientWorkoutSession>,
      {body: ClientUpdateSessionRequest; id: string}
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/client/workout_sessions/${id}`,
      }),
      invalidatesTags: (_, __, {id}) => [{type: 'WorkoutSession', id}],
    }),
    completeWorkoutSession: build.mutation<
      ApiResponse<ClientWorkoutSession>,
      {body?: ClientCompleteSessionRequest; id: string}
    >({
      query: ({body, id}) => ({
        body: body ?? {},
        method: 'POST',
        url: `/v1/client/workout_sessions/${id}/complete`,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    discardWorkoutSession: build.mutation<ApiResponse<ClientWorkoutSession>, string>({
      query: (id) => ({
        method: 'POST',
        url: `/v1/client/workout_sessions/${id}/discard`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    // ── Performed Set CRUD ─────────────────────────────────────
    logPerformedSet: build.mutation<ApiResponse<ClientPerformedSet>, ClientLogSetRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/client/performed_sets',
      }),
      invalidatesTags: (result) =>
        result
          ? [
              {type: 'WorkoutSession', id: result.data.workout_session_id},
              {type: 'PerformedSet', id: 'LIST'},
            ]
          : [{type: 'PerformedSet', id: 'LIST'}],
    }),
    updatePerformedSet: build.mutation<
      ApiResponse<ClientPerformedSet>,
      {body: ClientUpdateSetRequest; id: string; sessionId: string}
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/client/performed_sets/${id}`,
      }),
      invalidatesTags: (_, __, {id, sessionId}) => [
        {type: 'PerformedSet', id},
        {type: 'WorkoutSession', id: sessionId},
      ],
    }),
    deletePerformedSet: build.mutation<void, {id: string; sessionId: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/client/performed_sets/${id}`,
      }),
      invalidatesTags: (_, __, {id, sessionId}) => [
        {type: 'PerformedSet', id},
        {type: 'WorkoutSession', id: sessionId},
      ],
    }),
  }),
});

export const {
  useClientWorkoutSessionsInfiniteQuery,
  useCompleteWorkoutSessionMutation,
  useDeletePerformedSetMutation,
  useDiscardWorkoutSessionMutation,
  useGetActiveWorkoutSessionQuery,
  useGetClientWorkoutSessionQuery,
  useListClientWorkoutSessionsQuery,
  useLogPerformedSetMutation,
  useStartWorkoutSessionMutation,
  useUpdateClientWorkoutSessionMutation,
  useUpdatePerformedSetMutation,
} = clientWorkoutSessionsApi;
