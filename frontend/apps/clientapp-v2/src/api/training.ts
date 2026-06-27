/**
 * Client training — new schema (generated client). Replaces the old hand-written
 * trainingPlans.ts/workoutSessions.ts wrappers. plan_items are schedule entries
 * (day_of_week, training_workout_id; missing day = rest, no workout_type/rest_days);
 * sessions have state active/completed/discarded with performed_sets vs planned_snapshot.
 */
import {
  clientApi,
  useCreateClientPerformedSetMutation,
  useCreateClientTrainingSessionMutation,
  useDeleteClientPerformedSetMutation,
  useGetClientTrainingPlanQuery,
  useGetClientTrainingSessionQuery,
  useListClientTrainingPlansQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientPerformedSetMutation,
  useUpdateClientTrainingSessionMutation,
} from '@/api/generated';

export type {
  ClientTrainingPlan,
  TrainingPerformedSet,
  TrainingPlanExercise,
  TrainingPlanItem,
  TrainingPlanPlannedSet,
  TrainingPlanWorkout,
  TrainingPlanWorkoutExercise,
  TrainingSession,
} from '@/api/generated';

export {
  useCreateClientPerformedSetMutation,
  useCreateClientTrainingSessionMutation,
  useDeleteClientPerformedSetMutation,
  useGetClientTrainingPlanQuery,
  useGetClientTrainingSessionQuery,
  useListClientTrainingPlansQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientPerformedSetMutation,
  useUpdateClientTrainingSessionMutation,
};

clientApi.enhanceEndpoints({
  endpoints: {
    // create carries sessionId, so it refreshes the active session query directly.
    // update/delete performed-set only carry the set id — the active screen refetches
    // the session after those instead.
    createClientPerformedSet: {
      invalidatesTags: (_r, _e, {sessionId}) => [{type: 'WorkoutSession', id: sessionId}],
    },
    createClientTrainingSession: {invalidatesTags: [{type: 'WorkoutSession', id: 'LIST'}]},
    getClientTrainingPlan: {providesTags: (_r, _e, {id}) => [{type: 'TrainingPlan', id}]},
    getClientTrainingSession: {providesTags: (_r, _e, {id}) => [{type: 'WorkoutSession', id}]},
    listClientTrainingPlans: {providesTags: [{type: 'TrainingPlan', id: 'LIST'}]},
    listClientTrainingSessions: {providesTags: [{type: 'WorkoutSession', id: 'LIST'}]},
    updateClientTrainingSession: {
      invalidatesTags: (_r, _e, {id}) => [
        {type: 'WorkoutSession', id},
        {type: 'WorkoutSession', id: 'LIST'},
      ],
    },
  },
});
