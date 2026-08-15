import type {components, paths} from '@/api/schema';

type TrainingSessionUpdateRequest = components['schemas']['TrainingSessionUpdateRequest'];
type SessionListQuery = NonNullable<paths['/v1/client/training-sessions']['get']['parameters']['query']>;
type CompleteArgs = paths['/v1/client/training-sessions/{id}/complete']['post']['parameters']['path'] &
  TrainingSessionUpdateRequest;
type DiscardArgs = paths['/v1/client/training-sessions/{id}/discard']['post']['parameters']['path'];

export function clientTrainingSessionHistoryRequest(query: SessionListQuery = {}) {
  return {params: {query}};
}

export function clientTrainingSessionCompleteRequest({id, ...body}: CompleteArgs) {
  return {params: {path: {id}}, body};
}

export function clientTrainingSessionDiscardRequest({id}: DiscardArgs) {
  return {params: {path: {id}}};
}
