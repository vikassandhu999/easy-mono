import {TRAINING_DAY_LABELS} from '@easy/utils';

import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, getValidationErrors, listTags, pageTags} from '@/api/shared';
import {
  removeTrainingPlanItemFromPlan,
  removeWorkoutElementFromPlan,
  removeWorkoutFromPlan,
  replaceTrainingPlanInCache,
  upsertTrainingPlanItemInPlan,
  upsertWorkoutElementInPlan,
  upsertWorkoutInPlan,
} from '@/api/trainingPlanCache';

export type TrainingWeekday = 'friday' | 'monday' | 'saturday' | 'sunday' | 'thursday' | 'tuesday' | 'wednesday';
export type TrainingWorkoutType = 'alternative' | 'primary';

/**
 * One target per exercise. Every set in an exercise shares the same target;
 * the coach-facing UI no longer exposes `set_type` (warmup/working/etc) —
 * v3 spec collapses this to a single target. Session logging snapshots in
 * `workoutSessions.ts` still read `set_type` from historical records.
 */
export type PlannedSet = {
  distance_unit?: 'km' | 'meters' | 'miles' | 'none' | 'yards';
  distance_value?: null | number;
  duration_seconds?: null | number;
  intensity_target?: null | string;
  load_unit?: 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe';
  load_value?: null | number;
  notes?: null | string;
  rest_seconds?: null | number;
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
  position: number;
  superset_group_id: null | string;
  updated_at: string;
  workout_id: string;
};

export type Workout = {
  business_id: string;
  id: string;
  inserted_at: string;
  name: string;
  notes: null | string;
  training_plan_id: string;
  updated_at: string;
  workout_elements: WorkoutElement[];
};

export type TrainingPlanItem = {
  business_id: string;
  creator_id: string;
  day: TrainingWeekday;
  id: string;
  inserted_at: string;
  training_plan_id: string;
  updated_at: string;
  workout_id: string;
  workout_type: TrainingWorkoutType;
};

export type PlanClient = {
  first_name: null | string;
  id: string;
  last_name: null | string;
};

export type TrainingPlanStatus = 'active' | 'archived';

/**
 * Training plan shape. Coach-facing list and show endpoints preload both
 * `workouts` and `plan_items`, so both fields are non-optional here.
 */
export type TrainingPlan = {
  author_id: string;
  business_id: string;
  client: null | PlanClient;
  client_id: null | string;
  description: null | string;
  end_date: null | string;
  id: string;
  inserted_at: string;
  name: string;
  original_template_id: null | string;
  plan_items: TrainingPlanItem[];
  rest_days: TrainingWeekday[];
  start_date: null | string;
  status: TrainingPlanStatus;
  updated_at: string;
  workouts: Workout[];
};

export type TrainingPlanCreateRequest = {
  description?: string;
  end_date?: string;
  name: string;
  original_template_id?: string;
  rest_days?: TrainingWeekday[];
  start_date?: string;
  status?: TrainingPlanStatus;
};

export type TrainingPlanUpdateRequest = {
  description?: null | string;
  end_date?: null | string;
  name?: string;
  original_template_id?: null | string;
  rest_days?: TrainingWeekday[];
  start_date?: null | string;
  status?: TrainingPlanStatus;
};

export type TrainingPlanAssignRequest = {
  client_id: string;
  end_date?: string;
  start_date?: string;
};

export type WorkoutCreateRequest = {
  name: string;
  notes?: string;
};

export type WorkoutUpdateRequest = {
  name?: string;
  notes?: null | string;
};

export type TrainingPlanItemCreateRequest = {
  day: TrainingWeekday;
  workout_id: string;
  workout_type: TrainingWorkoutType;
};

/**
 * Backend currently only applies `day` and `workout_type` on PATCH. Relinking
 * a plan item to a different workout (`workout_id`) is NOT supported by the
 * backend changeset — do not add it until the backend catches up. To move a
 * workout reference, delete and recreate the plan item instead.
 */
export type TrainingPlanItemUpdateRequest = {
  day?: TrainingWeekday;
  workout_type?: TrainingWorkoutType;
};

export type WorkoutElementCreateRequest = {
  exercise_id: string;
  notes?: string;
  planned_sets?: PlannedSet[];
  position: number;
  superset_group_id?: string;
  workout_id: string;
};

export type WorkoutElementUpdateRequest = {
  exercise_id?: string;
  notes?: null | string;
  planned_sets?: PlannedSet[];
  position?: number;
  superset_group_id?: string;
};

export type ListTrainingPlansParams = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: TrainingPlanStatus;
};

/** Filter params for the templates infinite query — pagination is handled by infiniteQuery */
export type ListTrainingPlansFilters = {
  search?: string;
  status?: TrainingPlanStatus;
};

export type ListClientTrainingPlansParams = {
  clientId: string;
  limit?: number;
  offset?: number;
  status?: TrainingPlanStatus;
};

export type ListWorkoutsParams = {
  limit?: number;
  offset?: number;
  planId: string;
};

const PAGE_SIZE = 20;

const getPlanScopedPlanItemsId = (planId: string) => `TRAINING_PLAN_ITEMS_${planId}`;
const getPlanScopedWorkoutsId = (planId: string) => `TRAINING_WORKOUTS_${planId}`;

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
      query: (params) => ({url: '/v1/coach/training_plans', params}),
      providesTags: (result) => listTags('TrainingPlan', result),
    }),
    trainingPlans: build.infiniteQuery<ApiListResponse<TrainingPlan>, ListTrainingPlansFilters | void, number>({
      query: ({queryArg, pageParam}) => ({
        url: '/v1/coach/training_plans',
        params: {
          ...(queryArg?.search && {search: queryArg.search}),
          ...(queryArg?.status && {status: queryArg.status}),
          limit: PAGE_SIZE,
          offset: pageParam,
        },
      }),
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          const nextOffset = lastPageParam + PAGE_SIZE;
          return nextOffset < lastPage.count ? nextOffset : undefined;
        },
      },
      providesTags: (result) => pageTags('TrainingPlan', result),
    }),
    /**
     * List training plans assigned to a single client.
     * Separate from the template list — cached under CLIENT_LIST.
     */
    listClientTrainingPlans: build.query<ApiListResponse<TrainingPlan>, ListClientTrainingPlansParams>({
      query: ({clientId, ...params}) => ({
        params,
        url: `/v1/coach/clients/${clientId}/training_plans`,
      }),
      providesTags: (result) => listTags('TrainingPlan', result, 'CLIENT_LIST'),
    }),
    getTrainingPlan: build.query<ApiResponse<TrainingPlan>, string>({
      query: (id) => `/v1/coach/training_plans/${id}`,
      providesTags: (_, __, id) => [{type: 'TrainingPlan', id}],
    }),
    updateTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, {body: TrainingPlanUpdateRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/training_plans/${id}`,
      }),
      async onQueryStarted({id}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', id, (draft) => {
              replaceTrainingPlanInCache(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: () => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'TrainingPlan', id: 'CLIENT_LIST'},
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
        {type: 'TrainingPlan', id: 'CLIENT_LIST'},
        {type: 'TrainingPlanItem', id: getPlanScopedPlanItemsId(id)},
        {type: 'Workout', id: getPlanScopedWorkoutsId(id)},
      ],
    }),
    assignTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, {body: TrainingPlanAssignRequest; id: string}>({
      query: ({body, id}) => ({
        body,
        method: 'POST',
        url: `/v1/coach/training_plans/${id}/assign`,
      }),
      invalidatesTags: (_, __, {body}) => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'TrainingPlan', id: 'CLIENT_LIST'},
        {type: 'Client', id: 'LIST'},
        {type: 'Client', id: body.client_id},
      ],
    }),
    duplicateTrainingPlan: build.mutation<ApiResponse<TrainingPlan>, string>({
      query: (id) => ({
        method: 'POST',
        url: `/v1/coach/training_plans/${id}/duplicate`,
      }),
      invalidatesTags: [{type: 'TrainingPlan', id: 'LIST'}],
    }),
    createWorkout: build.mutation<ApiResponse<Workout>, {body: WorkoutCreateRequest; planId: string}>({
      query: ({body, planId}) => ({
        body,
        method: 'POST',
        url: `/v1/coach/training_plans/${planId}/workouts`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertWorkoutInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {planId}) => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'Workout', id: getPlanScopedWorkoutsId(planId)},
      ],
    }),
    listWorkouts: build.query<ApiListResponse<Workout>, ListWorkoutsParams>({
      query: ({planId, ...params}) => ({
        params,
        url: `/v1/coach/training_plans/${planId}/workouts`,
      }),
      providesTags: (result, __, {planId}) => listTags('Workout', result, getPlanScopedWorkoutsId(planId)),
    }),
    getWorkout: build.query<ApiResponse<Workout>, string>({
      query: (id) => `/v1/coach/workouts/${id}`,
      providesTags: (_, __, id) => [{type: 'Workout', id}],
    }),
    updateWorkout: build.mutation<ApiResponse<Workout>, {body: WorkoutUpdateRequest; id: string; planId: string}>({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/workouts/${id}`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertWorkoutInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'Workout', id},
        {type: 'Workout', id: getPlanScopedWorkoutsId(planId)},
      ],
    }),
    deleteWorkout: build.mutation<void, {id: string; planId: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/workouts/${id}`,
      }),
      async onQueryStarted({id, planId}, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              removeWorkoutFromPlan(draft, id);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'Workout', id},
        {type: 'Workout', id: getPlanScopedWorkoutsId(planId)},
      ],
    }),
    duplicateWorkout: build.mutation<ApiResponse<Workout>, {id: string; planId: string}>({
      query: ({id}) => ({
        method: 'POST',
        url: `/v1/coach/workouts/${id}/duplicate`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertWorkoutInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {planId}) => [
        {type: 'TrainingPlan', id: 'LIST'},
        {type: 'Workout', id: getPlanScopedWorkoutsId(planId)},
      ],
    }),
    createTrainingPlanItem: build.mutation<
      ApiResponse<TrainingPlanItem>,
      {body: TrainingPlanItemCreateRequest; planId: string}
    >({
      query: ({body, planId}) => ({
        body,
        method: 'POST',
        url: `/v1/coach/training_plans/${planId}/training_plan_items`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertTrainingPlanItemInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {planId}) => [{type: 'TrainingPlanItem', id: getPlanScopedPlanItemsId(planId)}],
    }),
    listTrainingPlanItems: build.query<ApiResponse<TrainingPlanItem[]>, string>({
      query: (planId) => `/v1/coach/training_plans/${planId}/training_plan_items`,
      providesTags: (result, __, planId) => listTags('TrainingPlanItem', result, getPlanScopedPlanItemsId(planId)),
    }),
    updateTrainingPlanItem: build.mutation<
      ApiResponse<TrainingPlanItem>,
      {body: TrainingPlanItemUpdateRequest; id: string; planId: string}
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/training_plan_items/${id}`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertTrainingPlanItemInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'TrainingPlanItem', id},
        {type: 'TrainingPlanItem', id: getPlanScopedPlanItemsId(planId)},
      ],
    }),
    deleteTrainingPlanItem: build.mutation<void, {id: string; planId: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/training_plan_items/${id}`,
      }),
      async onQueryStarted({id, planId}, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              removeTrainingPlanItemFromPlan(draft, id);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, planId}) => [
        {type: 'TrainingPlanItem', id},
        {type: 'TrainingPlanItem', id: getPlanScopedPlanItemsId(planId)},
      ],
    }),
    createWorkoutElement: build.mutation<
      ApiResponse<WorkoutElement>,
      {
        body: WorkoutElementCreateRequest;
        planId?: string;
        workoutId?: string;
      }
    >({
      query: ({body}) => ({
        body,
        method: 'POST',
        url: '/v1/coach/workout_elements',
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        if (!planId) {
          return;
        }
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertWorkoutElementInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {body, workoutId}) => [
        {type: 'WorkoutElement', id: 'LIST'},
        {type: 'TrainingPlan', id: 'LIST'},
        {
          type: 'Workout',
          id: workoutId ?? body.workout_id,
        },
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
        workoutId?: string;
      }
    >({
      query: ({body, id}) => ({
        body,
        method: 'PATCH',
        url: `/v1/coach/workout_elements/${id}`,
      }),
      async onQueryStarted({planId}, {dispatch, queryFulfilled}) {
        if (!planId) {
          return;
        }
        try {
          const {data} = await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              upsertWorkoutElementInPlan(draft, data.data);
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, workoutId}) => [
        {type: 'WorkoutElement', id},
        {type: 'WorkoutElement', id: 'LIST'},
        {type: 'TrainingPlan', id: 'LIST'},
        ...(workoutId ? [{type: 'Workout' as const, id: workoutId}] : []),
      ],
    }),
    deleteWorkoutElement: build.mutation<void, {id: string; planId?: string; workoutId?: string}>({
      query: ({id}) => ({
        method: 'DELETE',
        url: `/v1/coach/workout_elements/${id}`,
      }),
      async onQueryStarted({id, planId, workoutId}, {dispatch, queryFulfilled}) {
        if (!planId) {
          return;
        }
        try {
          await queryFulfilled;
          dispatch(
            trainingPlansApi.util.updateQueryData('getTrainingPlan', planId, (draft) => {
              removeWorkoutElementFromPlan(draft, {elementId: id, workoutId});
            }),
          );
        } catch {
          // Cache stays on the last confirmed server state.
        }
      },
      invalidatesTags: (_, __, {id, workoutId}) => [
        {type: 'WorkoutElement', id},
        {type: 'WorkoutElement', id: 'LIST'},
        ...(workoutId ? [{type: 'Workout' as const, id: workoutId}] : []),
      ],
    }),
  }),
});

export const {
  useAssignTrainingPlanMutation,
  useCreateTrainingPlanItemMutation,
  useCreateTrainingPlanMutation,
  useCreateWorkoutElementMutation,
  useCreateWorkoutMutation,
  useDeleteTrainingPlanItemMutation,
  useDeleteTrainingPlanMutation,
  useDeleteWorkoutElementMutation,
  useDeleteWorkoutMutation,
  useDuplicateTrainingPlanMutation,
  useDuplicateWorkoutMutation,
  useGetTrainingPlanQuery,
  useGetWorkoutElementQuery,
  useGetWorkoutQuery,
  useListClientTrainingPlansQuery,
  useListTrainingPlanItemsQuery,
  useListTrainingPlansQuery,
  useListWorkoutsQuery,
  useTrainingPlansInfiniteQuery,
  useUpdateTrainingPlanItemMutation,
  useUpdateTrainingPlanMutation,
  useUpdateWorkoutElementMutation,
  useUpdateWorkoutMutation,
} = trainingPlansApi;

// The backend returns field-keyed 422s under `error_detail.fields.*`. Two
// error shapes are relevant for training plan items:
//
//   1. Uniqueness conflict on (training_plan_id, day, workout_type).
//      Keyed under `training_plan_id` because it's the first column in the
//      composite DB index — NOT because the plan id is bad. Backend message:
//      "already has a workout of this type on this day".
//
//   2. Invalid `workout_type` (anything other than "primary"/"alternative").
//      Keyed under `workout_type` with message "is invalid".
//
// These helpers hide the key quirk from call sites so the UI can read the
// error semantically.

type PlanItemValidationError =
  | {kind: 'conflict'; day: TrainingWeekday; message: string; workoutType: TrainingWorkoutType}
  | {kind: 'invalid_workout_type'; message: string}
  | {kind: 'other'; fields: Record<string, string[]>};

/**
 * Interpret a 422 from POST /training_plan_items or PATCH /training_plan_items/:id.
 *
 * Pass the request body alongside so we can label the friendly message without
 * having to reach into the form state. Returns `null` if the error isn't a
 * validation error — caller should fall back to a generic toast.
 */
export function parsePlanItemValidationError(
  error: unknown,
  body: {day?: TrainingWeekday; workout_type?: TrainingWorkoutType},
): null | PlanItemValidationError {
  const fields = getValidationErrors(error);
  if (!fields) {
    return null;
  }

  // Uniqueness conflict — keyed under training_plan_id per the composite index.
  const planIdMsgs = fields.training_plan_id;
  if (planIdMsgs && planIdMsgs.length > 0 && body.day && body.workout_type) {
    const dayLabel = TRAINING_DAY_LABELS[body.day];
    const slot = body.workout_type === 'primary' ? 'primary' : 'alternative';
    return {
      kind: 'conflict',
      day: body.day,
      message: `${dayLabel} already has a ${slot} workout.`,
      workoutType: body.workout_type,
    };
  }

  const typeMsgs = fields.workout_type;
  if (typeMsgs && typeMsgs.length > 0) {
    return {
      kind: 'invalid_workout_type',
      message: `Workout type must be "primary" or "alternative".`,
    };
  }

  return {kind: 'other', fields};
}
