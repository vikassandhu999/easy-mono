import {api} from '@/api';
import {ApiListResponse, ApiResponse} from '@/api/shared';

export type PlannedSet = {
  distance_unit?: 'km' | 'meters' | 'miles' | 'none' | 'yards';
  distance_value?: null | number;
  duration_seconds?: null | number;
  intensity_target?: null | string;
  load_unit?: 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe';
  load_value?: null | number;
  notes?: null | string;
  rest_seconds?: null | number;
  set_type?: 'amrap' | 'backoff' | 'cluster' | 'dropset' | 'emom' | 'rest_pause' | 'warmup' | 'working';
  target_reps?: null | string;
  tempo?: null | string;
};

export type WorkoutElement = {
  business_id: string;
  exercise?: null | {
    force: null | string;
    id: string;
    mechanics: null | string;
    name: string;
  };
  exercise_id: string;
  id: string;
  inserted_at: string;
  notes: null | string;
  planned_sets: PlannedSet[];
  planned_workout_id: string;
  position: number;
  superset_group_id: null | string;
  updated_at: string;
};

export type PlannedWorkout = {
  business_id: string;
  day_number: number;
  id: string;
  inserted_at: string;
  name: string;
  notes: null | string;
  training_plan_id: string;
  updated_at: string;
  workout_elements: WorkoutElement[];
};

export type TrainingPlan = {
  author_id: string;
  business_id: string;
  client_id: null | string;
  description: null | string;
  end_date: null | string;
  id: string;
  inserted_at: string;
  is_template: boolean;
  name: string;
  original_template_id: null | string;
  planned_workouts: PlannedWorkout[];
  start_date: null | string;
  status: string;
  updated_at: string;
};

export type TrainingPlanCreateRequest = {
  client_id?: string;
  description?: string;
  end_date?: string;
  is_template?: boolean;
  name: string;
  original_template_id?: string;
  start_date?: string;
  status?: 'active' | 'archived' | 'draft';
};

export type TrainingPlanUpdateRequest = {
  client_id?: string;
  description?: string;
  end_date?: string;
  is_template?: boolean;
  name?: string;
  original_template_id?: string;
  start_date?: string;
  status?: 'active' | 'archived' | 'draft';
};

export type TrainingPlanAssignRequest = {
  client_id: string;
  end_date?: string;
  start_date?: string;
};

export type PlannedWorkoutCreateRequest = {
  day_number: number;
  name: string;
  notes?: string;
};

export type PlannedWorkoutUpdateRequest = {
  day_number?: number;
  name?: string;
  notes?: string;
};

export type WorkoutElementCreateRequest = {
  exercise_id: string;
  notes?: string;
  planned_sets?: PlannedSet[];
  planned_workout_id: string;
  position: number;
  superset_group_id?: string;
};

export type WorkoutElementUpdateRequest = {
  exercise_id?: string;
  notes?: string;
  planned_sets?: PlannedSet[];
  position?: number;
  superset_group_id?: string;
};

export type ListTrainingPlansParams = {
  client_id?: string;
  is_template?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  status?: 'active' | 'archived' | 'draft';
};

export type ListPlannedWorkoutsParams = {
  limit?: number;
  offset?: number;
  planId: string;
};

const getPlanScopedId = (planId: string) => `TRAINING_PLAN_${planId}`;

export const trainingPlansApi = api.injectEndpoints({
  endpoints: (build) => ({
    createTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, TrainingPlanCreateRequest>({
      query: (body) => ({
        body,
        method: 'POST',
        url: '/v1/coach/training_plans',
      }),
      invalidatesTags: [{type: 'TrainingPlan', id: 'LIST'}],
    }),
    listTrainingPlans: build.query<ApiListResponse<TrainingPlan>, ListTrainingPlansParams | void>({
      query: (params) =>
        params
          ? {
              params,
              url: '/v1/coach/training_plans',
            }
          : '/v1/coach/training_plans',
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
    getTrainingPlan: build.query<ApiResponse<TrainingPlan>, string>({
      query: (id) => `/v1/coach/training_plans/${id}`,
      providesTags: (_, __, id) => [
        {type: 'TrainingPlan', id},
        {type: 'PlannedWorkout', id: getPlanScopedId(id)},
      ],
    }),
    updateTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, {body: TrainingPlanUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/training_plans/${id}`,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'TrainingPlan', id},
        {type: 'TrainingPlan', id: 'LIST'},
      ],
    }),
    deleteTrainingPlan: build.mutation<void, string>({
      query: (id) => ({
        method: 'DELETE',
        url: `/v1/coach/training_plans/${id}`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'TrainingPlan', id},
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'PlannedWorkout', id: getPlanScopedId(id)},
      ],
    }),
    assignTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, {body: TrainingPlanAssignRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'POST',
        url: `/v1/coach/training_plans/${id}/assign`,
      }),
      invalidatesTags: (_, __, {id}) => [
        {type: 'TrainingPlan', id},
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'Client', id: 'LIST'},
      ],
    }),
    duplicateTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, string>({
      query: (id) => ({
        method: 'POST',
        url: `/v1/coach/training_plans/${id}/duplicate`,
      }),
      invalidatesTags: (_, __, id) => [
        {type: 'TrainingPlan', id},
        {type: 'TrainingPlan', id: 'LIST'},
      ],
    }),
    createPlannedWorkout: build.mutation<
      ApiResponse<PlannedWorkout>,
      {body: PlannedWorkoutCreateRequest; planId: string}
    >({
      query: ({body, planId}) => ({
        body,
        method: 'POST',
        url: `/v1/coach/training_plans/${planId}/planned_workouts`,
      }),
      invalidatesTags: (_, __, {planId}) => [
        {type: 'TrainingPlan', id: planId},
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'PlannedWorkout', id: getPlanScopedId(planId)},
      ],
    }),
    listPlannedWorkouts: build.query<ApiListResponse<PlannedWorkout>, ListPlannedWorkoutsParams>({
      query: ({planId, ...params}) => ({
        params,
        url: `/v1/coach/training_plans/${planId}/planned_workouts`,
      }),
      providesTags: (result, __, {planId}) =>
        result
          ? [
              ...result.data.map((plannedWorkout) => ({
                type: 'PlannedWorkout' as const,
                id: plannedWorkout.id,
              })),
              {type: 'PlannedWorkout' as const, id: getPlanScopedId(planId)},
            ]
          : [{type: 'PlannedWorkout' as const, id: getPlanScopedId(planId)}],
    }),
    getPlannedWorkout: build.query<ApiResponse<PlannedWorkout>, string>({
      query: (id) => `/v1/coach/planned_workouts/${id}`,
      providesTags: (_, __, id) => [{type: 'PlannedWorkout', id}],
    }),
    updatePlannedWorkout: build.mutation<
      ApiResponse<PlannedWorkout>,
      {body: PlannedWorkoutUpdateRequest; id: string; planId: string}
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/planned_workouts/${id}`,
      }),
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'PlannedWorkout', id},
        {type: 'PlannedWorkout', id: getPlanScopedId(planId)},
        {type: 'TrainingPlan', id: planId},
        {type: 'TrainingPlan', id: 'LIST'},
      ],
    }),
    deletePlannedWorkout: build.mutation<void, {id: string; planId: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/planned_workouts/${id}`,
      }),
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'PlannedWorkout', id},
        {type: 'PlannedWorkout', id: getPlanScopedId(planId)},
        {type: 'TrainingPlan', id: planId},
        {type: 'TrainingPlan', id: 'LIST'},
      ],
    }),
    createWorkoutElement: build.mutation<
      ApiResponse<WorkoutElement>,
      {
        body: WorkoutElementCreateRequest;
        planId?: string;
        plannedWorkoutId?: string;
      }
    >({
      query: ({body}) => ({
        body,
        method: 'POST',
        url: '/v1/coach/workout_elements',
      }),
      invalidatesTags: (_, __, {body, planId, plannedWorkoutId}) => [
        {type: 'WorkoutElement', id: 'LIST'},
        {
          type: 'PlannedWorkout',
          id: plannedWorkoutId ?? body.planned_workout_id,
        },
        ...(planId ? [{type: 'TrainingPlan' as const, id: planId}] : []),
      ],
    }),
    getWorkoutElement: build.query<ApiResponse<WorkoutElement>, string>({
      query: (id) => `/v1/coach/workout_elements/${id}`,
      providesTags: (_, __, id) => [{type: 'WorkoutElement', id}],
    }),
    updateWorkoutElement: build.mutation<
      ApiResponse<WorkoutElement>,
      {
        body: WorkoutElementUpdateRequest;
        id: string;
        planId?: string;
        plannedWorkoutId?: string;
      }
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/workout_elements/${id}`,
      }),
      invalidatesTags: (_, __, {id, planId, plannedWorkoutId}) => [
        {type: 'WorkoutElement', id},
        {type: 'WorkoutElement', id: 'LIST'},
        ...(plannedWorkoutId ? [{type: 'PlannedWorkout' as const, id: plannedWorkoutId}] : []),
        ...(planId ? [{type: 'TrainingPlan' as const, id: planId}] : []),
      ],
    }),
    deleteWorkoutElement: build.mutation<void, {id: string; planId?: string; plannedWorkoutId?: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/workout_elements/${id}`,
      }),
      invalidatesTags: (_, __, {id, planId, plannedWorkoutId}) => [
        {type: 'WorkoutElement', id},
        {type: 'WorkoutElement', id: 'LIST'},
        ...(plannedWorkoutId ? [{type: 'PlannedWorkout' as const, id: plannedWorkoutId}] : []),
        ...(planId ? [{type: 'TrainingPlan' as const, id: planId}] : []),
      ],
    }),
  }),
});

export const {
  useAssignTrainingPlanMutation,
  useCreatePlannedWorkoutMutation,
  useCreateTrainingPlanMutation,
  useCreateWorkoutElementMutation,
  useDeletePlannedWorkoutMutation,
  useDeleteTrainingPlanMutation,
  useDeleteWorkoutElementMutation,
  useDuplicateTrainingPlanMutation,
  useGetPlannedWorkoutQuery,
  useGetTrainingPlanQuery,
  useGetWorkoutElementQuery,
  useListPlannedWorkoutsQuery,
  useListTrainingPlansQuery,
  useUpdatePlannedWorkoutMutation,
  useUpdateTrainingPlanMutation,
  useUpdateWorkoutElementMutation,
} = trainingPlansApi;
