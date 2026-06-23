import {api} from '@/api/base';
import {ApiListResponse, ApiResponse, listTags, pageTags} from '@/api/shared';

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
              draft.data = data.data;
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
  }),
});

export const {
  useAssignTrainingPlanMutation,
  useCreateTrainingPlanMutation,
  useDeleteTrainingPlanMutation,
  useGetTrainingPlanQuery,
  useListClientTrainingPlansQuery,
  useListTrainingPlansQuery,
  useTrainingPlansInfiniteQuery,
  useUpdateTrainingPlanMutation,
} = trainingPlansApi;
