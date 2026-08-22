import type {components, paths} from './schema.ts';

// --- training-coverage ---

type ClientTrainingCoverageResponse = components['schemas']['ClientTrainingCoverageResponse'];
type ClientTrainingPlan = components['schemas']['ClientTrainingPlan'];
type CoverageQuery = NonNullable<paths['/v1/client/training-plans/coverage']['get']['parameters']['query']>;

export function clientTrainingCoverageRequest(date?: string): {params: {query: CoverageQuery}} {
  return {params: {query: date ? {date} : {}}};
}

export function clientTrainingPlanFromCoverage(
  coverage?: ClientTrainingCoverageResponse,
): ClientTrainingPlan | undefined {
  return coverage?.data?.plan;
}

// --- training-session-commands ---

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
