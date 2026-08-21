/**
 * Client progress — weight tracking. The list endpoint returns
 * {entries, summary, goal, adherence}; we drive off the typed `entries[]` and read
 * the opaque `goal` (the client's target weight from their coaching profile) defensively.
 */
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {weightEntryKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export type WeightEntry = components['schemas']['WeightEntry'];
type WeightEntryRequest = components['schemas']['WeightEntryRequest'];

type ListQuery = paths['/v1/client/weight_entries']['get']['parameters']['query'];

type WeightGoal = {unit?: null | string; value?: null | number};

export function asGoal(goal: unknown): null | WeightGoal {
  return goal && typeof goal === 'object' ? (goal as WeightGoal) : null;
}

export function useListWeightEntriesQuery(query: ListQuery = {}) {
  return useQuery({
    queryKey: weightEntryKeys.list(query),
    queryFn: () => call(client.GET('/v1/client/weight_entries', {params: {query}})),
  });
}

export function useCreateWeightEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WeightEntryRequest) =>
      call(client.POST('/v1/client/weight_entries', {body})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: weightEntryKeys.lists()});
    },
  });
}

export function useDeleteWeightEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(client.DELETE('/v1/client/weight_entries/{id}', {params: {path: {id}}})),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: weightEntryKeys.lists()});
    },
  });
}
