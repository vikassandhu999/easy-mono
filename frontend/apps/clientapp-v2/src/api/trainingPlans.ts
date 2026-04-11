import {api} from '@/api/base';
import {ApiListResponse, ApiResponse} from '@/api/shared';

// ── Shared enums ─────────────────────────────────────────────

export type LoadUnit = 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe';
export type DistanceUnit = 'km' | 'meters' | 'miles' | 'none' | 'yards';
export type SetType = 'amrap' | 'backoff' | 'cluster' | 'dropset' | 'emom' | 'rest_pause' | 'warmup' | 'working';
export type ExerciseMechanics = 'compound' | 'isolation' | 'isometric';
export type ExerciseForce = 'pull' | 'push' | 'static';
export type TrainingPlanStatus = 'active' | 'archived';

// ── PlannedSet (shared schema — same as coach) ───────────────

export type PlannedSet = {
  distance_unit?: DistanceUnit | null;
  distance_value?: null | number;
  duration_seconds?: null | number;
  intensity_target?: null | string;
  load_unit?: LoadUnit | null;
  load_value?: null | number;
  notes?: null | string;
  rest_seconds?: null | number;
  set_type?: SetType;
  target_reps?: null | string;
  tempo?: null | string;
};

// ── ClientExerciseSummary (lighter than full exercise) ───────

export type ClientExerciseSummary = {
  force: ExerciseForce | null;
  id: string;
  images: string[];
  mechanics: ExerciseMechanics | null;
  name: string;
};

// ── ClientWorkoutElement ─────────────────────────────────────

export type ClientWorkoutElement = {
  exercise: ClientExerciseSummary;
  exercise_id: string;
  id: string;
  inserted_at: string;
  notes: null | string;
  planned_sets: PlannedSet[];
  position: number;
  superset_group_id: null | string;
  updated_at: string;
};

// ── ClientPlannedWorkout ─────────────────────────────────────

export type ClientPlannedWorkout = {
  day_number: number;
  id: string;
  inserted_at: string;
  name: string;
  notes: null | string;
  updated_at: string;
  workout_elements: ClientWorkoutElement[];
};

// ── ClientTrainingPlan ───────────────────────────────────────

export type ClientTrainingPlan = {
  description: null | string;
  end_date: null | string;
  id: string;
  inserted_at: string;
  name: string;
  planned_workouts: ClientPlannedWorkout[];
  start_date: null | string;
  status: TrainingPlanStatus;
  updated_at: string;
};

// ── List params ──────────────────────────────────────────────

export type ListClientTrainingPlansParams = {
  limit?: number;
  offset?: number;
  status?: TrainingPlanStatus;
};

// ── Endpoints ────────────────────────────────────────────────

export const clientTrainingPlansApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientTrainingPlan: build.query<ApiResponse<ClientTrainingPlan>, string>({
      query: (id) => `/v1/client/training_plans/${id}`,
      providesTags: (_, __, id) => [{type: 'TrainingPlan', id}],
    }),
    listClientTrainingPlans: build.query<ApiListResponse<ClientTrainingPlan>, ListClientTrainingPlansParams | void>({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/client/training_plans',
            }
          : '/v1/client/training_plans',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((plan) => ({
                type: 'TrainingPlan' as const,
                id: plan.id,
              })),
              {type: 'TrainingPlan' as const, id: 'LIST'},
            ]
          : [{type: 'TrainingPlan' as const, id: 'LIST'}],
    }),
  }),
});

export const {useGetClientTrainingPlanQuery, useListClientTrainingPlansQuery} = clientTrainingPlansApi;
