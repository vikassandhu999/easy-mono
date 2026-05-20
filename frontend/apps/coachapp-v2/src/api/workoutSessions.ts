import {api} from '@/api/base';
import {workoutSessionFromApi, performedSetFromApi} from '@/api/mappers/workoutSessions';
import {ApiListResponse, ApiResponse} from '@/api/shared';

export type WorkoutSessionState = 'active' | 'completed' | 'discarded';
export type LoadUnit = 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe';
export type DistanceUnit = 'km' | 'meters' | 'miles' | 'none' | 'yards';
export type SetType = 'amrap' | 'backoff' | 'cluster' | 'dropset' | 'emom' | 'rest_pause' | 'warmup' | 'working';

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

export type ExerciseBrief = {
  force: null | string;
  id: string;
  mechanics: null | string;
  name: string;
};

export type PerformedSet = {
  actual_reps: null | string;
  business_id: string;
  completed: boolean;
  distance_unit: DistanceUnit | null;
  distance_value: null | number;
  exercise: ExerciseBrief | null;
  exercise_id: string;
  id: string;
  inserted_at: string;
  intensity_felt: null | string;
  load_unit: LoadUnit | null;
  load_value: null | number;
  notes: null | string;
  position: number;
  rir: null | number;
  rpe: null | number;
  tempo_actual: null | string;
  updated_at: string;
  workout_element_id: null | string;
  workout_session_id: string;
};

export type WorkoutSession = {
  business_id: string;
  client_id: string;
  ended_at: null | string;
  id: string;
  inserted_at: string;
  notes: null | string;
  performed_sets: PerformedSet[];
  planned_snapshot: null | PlannedSnapshot;
  workout_id: null | string;
  soreness_rating: null | number;
  started_at: string;
  state: WorkoutSessionState;
  updated_at: string;
};

export type WorkoutSessionCreateRequest = {
  client_id: string;
  notes?: null | string;
  workout_id?: null | string;
};

export type WorkoutSessionUpdateRequest = {
  notes?: null | string;
  soreness_rating?: null | number;
};

export type WorkoutSessionCompleteRequest = {
  notes?: null | string;
  soreness_rating?: null | number;
};

export type PerformedSetCreateRequest = {
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

export type PerformedSetUpdateRequest = {
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

export type ListWorkoutSessionsParams = {
  client_id?: string;
  limit?: number;
  offset?: number;
  state?: WorkoutSessionState;
};

export type ListWorkoutSessionsFilters = {
  client_id?: string;
  state?: WorkoutSessionState;
};

export type ApiWorkoutSession = WorkoutSession;
export type ApiPerformedSet = PerformedSet;

const PAGE_SIZE = 20;

function mapWorkoutSessionResponse(response: ApiResponse<ApiWorkoutSession>): ApiResponse<WorkoutSession> {
  return {
    ...response,
    data: workoutSessionFromApi(response.data),
  };
}

function mapWorkoutSessionListResponse(response: ApiListResponse<ApiWorkoutSession>): ApiListResponse<WorkoutSession> {
  return {
    ...response,
    data: response.data.map(workoutSessionFromApi),
  };
}

function mapPerformedSetResponse(response: ApiResponse<ApiPerformedSet>): ApiResponse<PerformedSet> {
  return {
    ...response,
    data: performedSetFromApi(response.data),
  };
}

export const workoutSessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    createWorkoutSession: build.mutation<ApiResponse<WorkoutSession>, WorkoutSessionCreateRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/coach/workout_sessions',
      }),
      transformResponse: mapWorkoutSessionResponse,
      invalidatesTags: [{type: 'WorkoutSession', id: 'LIST'}],
    }),
    listWorkoutSessions: build.query<ApiListResponse<WorkoutSession>, ListWorkoutSessionsParams | void>({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/coach/workout_sessions',
            }
          : '/v1/coach/workout_sessions',
      transformResponse: mapWorkoutSessionListResponse,
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
    workoutSessions: build.infiniteQuery<ApiListResponse<WorkoutSession>, ListWorkoutSessionsFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/workout_sessions',
        params: {
          ...(queryArg?.client_id && {client_id: queryArg.client_id}),
          ...(queryArg?.state && {state: queryArg.state}),
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      }),
      transformResponse: mapWorkoutSessionListResponse,
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
    getWorkoutSession: build.query<ApiResponse<WorkoutSession>, string>({
      query: (id) => `/v1/coach/workout_sessions/${id}`,
      transformResponse: mapWorkoutSessionResponse,
      providesTags: (_, __, id) => [{type: 'WorkoutSession', id}],
    }),
    updateWorkoutSession: build.mutation<ApiResponse<WorkoutSession>, {body: WorkoutSessionUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/workout_sessions/${id}`,
      }),
      transformResponse: mapWorkoutSessionResponse,
      invalidatesTags: (_, __, {id}) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    completeWorkoutSession: build.mutation<
      ApiResponse<WorkoutSession>,
      {body?: WorkoutSessionCompleteRequest; id: string}
    >({
      query: ({body, id}) => ({
        body: body ?? {},
        method: 'POST',
        url: `/v1/coach/workout_sessions/${id}/complete`,
      }),
      transformResponse: mapWorkoutSessionResponse,
      invalidatesTags: (_, __, {id}) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    discardWorkoutSession: build.mutation<ApiResponse<WorkoutSession>, string>({
      query: (id) => ({
        method: 'POST',
        url: `/v1/coach/workout_sessions/${id}/discard`,
      }),
      transformResponse: mapWorkoutSessionResponse,
      invalidatesTags: (_, __, id) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    deleteWorkoutSession: build.mutation<void, string>({
      query: (id) => ({
        method: 'DELETE',
        url: `/v1/coach/workout_sessions/${id}`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    }),
    createPerformedSet: build.mutation<ApiResponse<PerformedSet>, PerformedSetCreateRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/coach/performed_sets',
      }),
      transformResponse: mapPerformedSetResponse,
      invalidatesTags: (result) =>
        result
          ? [
              {type: 'WorkoutSession', id: result.data.workout_session_id},
              {type: 'PerformedSet', id: 'LIST'},
            ]
          : [{type: 'PerformedSet', id: 'LIST'}],
    }),
    updatePerformedSet: build.mutation<
      ApiResponse<PerformedSet>,
      {body: PerformedSetUpdateRequest; id: string; sessionId: string}
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/performed_sets/${id}`,
      }),
      transformResponse: mapPerformedSetResponse,
      invalidatesTags: (_, __, {id, sessionId}) => [
        {type: 'PerformedSet', id},
        {type: 'WorkoutSession', id: sessionId},
      ],
    }),
    deletePerformedSet: build.mutation<void, {id: string; sessionId: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/performed_sets/${id}`,
      }),
      invalidatesTags: (_, __, {id, sessionId}) => [
        {type: 'PerformedSet', id},
        {type: 'WorkoutSession', id: sessionId},
      ],
    }),
  }),
});

export const {
  useCompleteWorkoutSessionMutation,
  useCreatePerformedSetMutation,
  useCreateWorkoutSessionMutation,
  useDeletePerformedSetMutation,
  useDeleteWorkoutSessionMutation,
  useDiscardWorkoutSessionMutation,
  useGetWorkoutSessionQuery,
  useListWorkoutSessionsQuery,
  useUpdatePerformedSetMutation,
  useUpdateWorkoutSessionMutation,
  useWorkoutSessionsInfiniteQuery,
} = workoutSessionsApi;
