import type {paths} from './schema.ts';

type ListCoachClientTrainingSessionsQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-sessions']['get']['parameters']['query']
>;

export function coachClientTrainingSessionHistoryRequest(
  clientId: string,
  query?: ListCoachClientTrainingSessionsQuery,
) {
  return {params: {path: {client_id: clientId}, query}};
}
