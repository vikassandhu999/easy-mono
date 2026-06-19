import {api} from '@/api/base';
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

const PAGE_SIZE = 20;

export const workoutSessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listWorkoutSessions: build.query<ApiListResponse<WorkoutSession>, ListWorkoutSessionsParams | void>({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/coach/workout_sessions',
            }
          : '/v1/coach/workout_sessions',
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
      providesTags: (_, __, id) => [{type: 'WorkoutSession', id}],
    }),
  }),
});

export const {
  useGetWorkoutSessionQuery,
  useListWorkoutSessionsQuery,
  useWorkoutSessionsInfiniteQuery,
} = workoutSessionsApi;
