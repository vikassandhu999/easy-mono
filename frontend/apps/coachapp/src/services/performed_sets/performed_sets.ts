import {baseAPISlice} from '../baseAPISlice';
import {type CreatePerformedSet, type PerformedSet, type UpdatePerformedSet} from './performed_sets_definition';

export const performedSetsApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Log a set during workout
     * POST /api/coach/performed_sets
     */
    createPerformedSet: build.mutation<PerformedSet, CreatePerformedSet>({
      query: (body) => ({
        url: '/api/coach/performed_sets',
        method: 'POST',
        data: {performed_set: body},
      }),
      transformResponse: (response: {data: PerformedSet}) => response.data,
      invalidatesTags: (result) => [
        {type: 'PerformedSets', id: 'LIST'},
        result ? {type: 'WorkoutSessions', id: result.workout_session_id} : {type: 'WorkoutSessions', id: 'LIST'},
      ],
    }),

    /**
     * Update logged set
     * PATCH /api/coach/performed_sets/:id
     */
    updatePerformedSet: build.mutation<PerformedSet, UpdatePerformedSet>({
      query: ({id, ...body}) => ({
        url: `/api/coach/performed_sets/${id}`,
        method: 'PATCH',
        data: {performed_set: body},
      }),
      transformResponse: (response: {data: PerformedSet}) => response.data,
      invalidatesTags: (result, _error, {id}) => [
        {type: 'PerformedSets', id},
        result ? {type: 'WorkoutSessions', id: result.workout_session_id} : {type: 'WorkoutSessions', id: 'LIST'},
      ],
    }),

    /**
     * Delete set (undo)
     * DELETE /api/coach/performed_sets/:id
     */
    deletePerformedSet: build.mutation<void, string>({
      query: (id) => ({
        url: `/api/coach/performed_sets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        {type: 'PerformedSets', id},
        {type: 'PerformedSets', id: 'LIST'},
        {type: 'WorkoutSessions', id: 'LIST'},
      ],
    }),
  }),
  overrideExisting: false,
});

export const {useCreatePerformedSetMutation, useUpdatePerformedSetMutation, useDeletePerformedSetMutation} =
  performedSetsApi;

// Re-export types
export type {CreatePerformedSet, PerformedSet, UpdatePerformedSet} from './performed_sets_definition';
