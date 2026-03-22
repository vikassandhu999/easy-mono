import {baseAPISlice} from '../baseAPISlice';
import {
  type CreateWorkoutSession,
  type WorkoutSession,
  type WorkoutSessionList,
  type WorkoutSessionListOpts,
} from './workout_sessions_definition';

export const workoutSessionsApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * List sessions (filterable)
     * GET /api/coach/sessions
     */
    listWorkoutSessions: build.query<WorkoutSessionList, void | WorkoutSessionListOpts>({
      query: (params) => ({
        url: '/api/coach/sessions',
        method: 'GET',
        params: params || undefined,
      }),
      transformResponse: (response: WorkoutSessionList | {data: WorkoutSessionList}) =>
        'data' in response ? response.data : response,
      providesTags: (result) =>
        result
          ? [
              ...result.records.map(({id}) => ({
                type: 'WorkoutSessions' as const,
                id,
              })),
              {type: 'WorkoutSessions', id: 'LIST'},
            ]
          : [{type: 'WorkoutSessions', id: 'LIST'}],
    }),

    /**
     * Start new session
     * POST /api/coach/sessions
     */
    createWorkoutSession: build.mutation<WorkoutSession, CreateWorkoutSession>({
      query: (body) => ({
        url: '/api/coach/sessions',
        method: 'POST',
        data: {workout_session: body},
      }),
      transformResponse: (response: {data: WorkoutSession}) => response.data,
      invalidatesTags: [{type: 'WorkoutSessions', id: 'LIST'}],
    }),

    /**
     * Show with performed sets
     * GET /api/coach/sessions/:id
     */
    getWorkoutSession: build.query<WorkoutSession, string>({
      query: (id) => ({
        url: `/api/coach/sessions/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: {data: WorkoutSession}) => response.data,
      providesTags: (_result, _error, id) => [{type: 'WorkoutSessions', id}],
    }),

    /**
     * Complete session
     * PUT /api/coach/sessions/:id/complete
     */
    completeWorkoutSession: build.mutation<WorkoutSession, string>({
      query: (id) => ({
        url: `/api/coach/sessions/${id}/complete`,
        method: 'PUT',
      }),
      transformResponse: (response: {data: WorkoutSession}) => response.data,
      invalidatesTags: (_result, _error, id) => [
        {type: 'WorkoutSessions', id},
        {type: 'WorkoutSessions', id: 'LIST'},
      ],
    }),

    /**
     * Discard session
     * PUT /api/coach/sessions/:id/discard
     */
    discardWorkoutSession: build.mutation<WorkoutSession, string>({
      query: (id) => ({
        url: `/api/coach/sessions/${id}/discard`,
        method: 'PUT',
      }),
      transformResponse: (response: {data: WorkoutSession}) => response.data,
      invalidatesTags: (_result, _error, id) => [
        {type: 'WorkoutSessions', id},
        {type: 'WorkoutSessions', id: 'LIST'},
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListWorkoutSessionsQuery,
  useCreateWorkoutSessionMutation,
  useGetWorkoutSessionQuery,
  useCompleteWorkoutSessionMutation,
  useDiscardWorkoutSessionMutation,
} = workoutSessionsApi;

// Re-export types
export type {
  CreateWorkoutSession,
  WorkoutSession,
  WorkoutSessionList,
  WorkoutSessionListOpts,
} from './workout_sessions_definition';
