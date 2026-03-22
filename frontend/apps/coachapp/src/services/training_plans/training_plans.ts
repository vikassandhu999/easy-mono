import {baseAPISlice} from '../baseAPISlice';
import {buildListParams, getNextPage} from '../paginationUtils';
import {
  AssignTrainingPlanInput,
  CreateTrainingPlan,
  TrainingPlan,
  TrainingPlansList,
  TrainingPlansListOpts,
  UpdateTrainingPlan,
} from './training_plans_definition';

export const trainingPlansApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    createTrainingPlan: build.mutation<TrainingPlan, CreateTrainingPlan>({
      query: (body) => ({
        url: '/api/coach/training_plans',
        method: 'post',
        data: {training_plan: body},
      }),
      transformResponse: (response: {data: TrainingPlan}) => response.data,
      invalidatesTags: (result) => [
        {type: 'TrainingPlans', id: result?.id},
        {type: 'TrainingPlans', id: 'LIST'},
      ],
    }),

    getTrainingPlan: build.query<TrainingPlan, string>({
      query: (id) => ({
        url: `/api/coach/training_plans/${id}`,
        method: 'get',
      }),
      transformResponse: (response: {data: TrainingPlan}) => response.data,
      providesTags: (_result, _error, id) => [{type: 'TrainingPlans', id}],
    }),

    updateTrainingPlan: build.mutation<TrainingPlan, UpdateTrainingPlan>({
      query: (body) => ({
        url: `/api/coach/training_plans/${body.id}`,
        method: 'put',
        data: {
          training_plan: {
            ...body,
            id: undefined,
            inserted_at: undefined,
            updated_at: undefined,
          },
        },
      }),
      transformResponse: (response: {data: TrainingPlan}) => response.data,
      invalidatesTags: (result) => [
        {type: 'TrainingPlans', id: result?.id},
        {type: 'TrainingPlans', id: 'LIST'},
      ],
    }),

    listTrainingPlans: build.infiniteQuery<TrainingPlansList, TrainingPlansListOpts, number>({
      query: ({queryArg, pageParam = 0}) => ({
        url: '/api/coach/training_plans',
        method: 'get',
        params: buildListParams(queryArg, pageParam),
      }),
      transformResponse: (response: {data: TrainingPlan[]; meta: TrainingPlansList['meta']}) => ({
        records: response.data,
        meta: response.meta || {
          offset: 0,
          limit: 10,
          total: response.data.length,
        }, // Fallback if meta missing
      }),
      providesTags: (result) => {
        const baseTag = [{type: 'TrainingPlans' as const, id: 'LIST'}];

        if (!result) {
          return baseTag;
        }

        const records = result.pages.flatMap((page) => page.records);

        if (records.length === 0) {
          return baseTag;
        }

        return [
          ...records.map((plan) => ({
            type: 'TrainingPlans' as const,
            id: plan.id,
          })),
          ...baseTag,
        ];
      },
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage) => getNextPage(lastPage),
      },
    }),

    deleteTrainingPlan: build.mutation<void, string>({
      query: (id) => ({
        url: `/api/coach/training_plans/${id}`,
        method: 'delete',
      }),
      invalidatesTags: (_result, _error, id) => [
        {type: 'TrainingPlans', id},
        {type: 'TrainingPlans', id: 'LIST'},
      ],
    }),

    assignTrainingPlan: build.mutation<TrainingPlan, AssignTrainingPlanInput & {id: string}>({
      query: ({id, client_id, start_date, end_date}) => ({
        url: `/api/coach/training_plans/${id}/assign`,
        method: 'post',
        data: {client_id, start_date, end_date},
      }),
      transformResponse: (response: {data: TrainingPlan}) => response.data,
      invalidatesTags: ['TrainingPlans'],
    }),

    duplicateTrainingPlan: build.mutation<TrainingPlan, string>({
      query: (id) => ({
        url: `/api/coach/training_plans/${id}/duplicate`,
        method: 'post',
      }),
      transformResponse: (response: {data: TrainingPlan}) => response.data,
      invalidatesTags: (result) => [
        {type: 'TrainingPlans', id: result?.id},
        {type: 'TrainingPlans', id: 'LIST'},
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateTrainingPlanMutation: useCreateTrainingPlan,
  useUpdateTrainingPlanMutation: useUpdateTrainingPlan,
  useGetTrainingPlanQuery: useGetTrainingPlan,
  useListTrainingPlansInfiniteQuery: useListTrainingPlans,
  useDeleteTrainingPlanMutation: useDeleteTrainingPlan,
  useAssignTrainingPlanMutation: useAssignTrainingPlan,
  useDuplicateTrainingPlanMutation: useDuplicateTrainingPlan,
} = trainingPlansApi;
