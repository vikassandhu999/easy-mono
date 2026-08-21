import type {paths} from './schema.ts';
import {omitUndefined} from './shared.ts';

type ListCoachClientTrainingSessionsQuery = NonNullable<
  paths['/v1/coach/clients/{client_id}/training-sessions']['get']['parameters']['query']
>;

export function coachClientTrainingSessionHistoryRequest(
  clientId: string,
  query?: ListCoachClientTrainingSessionsQuery,
) {
  return query
    ? {params: {path: {client_id: clientId}, query: omitUndefined(query)}}
    : {params: {path: {client_id: clientId}}};
}
