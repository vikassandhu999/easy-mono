import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {exerciseKeys} from './keys';

export type {Exercise} from './schema';
export function useExercises(search: string) {
  return useQuery({
    queryKey: exerciseKeys.list(search),
    queryFn: ({signal}) => call(client.GET('/v1/client/exercises', {params: {query: {search, limit: 50}}, signal})),
  });
}
