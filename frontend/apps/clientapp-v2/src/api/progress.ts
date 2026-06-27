/**
 * Client progress — weight tracking (generated client). The list endpoint returns
 * {entries, summary, goal, adherence}; we drive off the typed `entries[]` and read
 * the opaque `goal` (the client's target weight from their coaching profile) defensively.
 */
import {
  clientApi,
  useCreateWeightEntryMutation,
  useDeleteWeightEntryMutation,
  useListWeightEntriesQuery,
} from '@/api/generated';

export type {WeightEntry, WeightEntryRequest} from '@/api/generated';

export {useCreateWeightEntryMutation, useDeleteWeightEntryMutation, useListWeightEntriesQuery};

export type WeightGoal = {unit?: null | string; value?: null | number};

export function asGoal(goal: unknown): null | WeightGoal {
  return goal && typeof goal === 'object' ? (goal as WeightGoal) : null;
}

clientApi.enhanceEndpoints({
  endpoints: {
    createWeightEntry: {invalidatesTags: [{id: 'LIST', type: 'WeightEntry'}]},
    deleteWeightEntry: {invalidatesTags: [{id: 'LIST', type: 'WeightEntry'}]},
    listWeightEntries: {providesTags: [{id: 'LIST', type: 'WeightEntry'}]},
  },
});
