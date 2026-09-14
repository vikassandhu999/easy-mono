import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {authKeys, businessKeys, weightProgressKeys} from './keys';
import {queryClient} from './query-client';
import type {BusinessUpdate} from './schema';
import {getSession} from './session';

export type {Business, BusinessUpdate} from './schema';

function assertSession(sessionId: string | undefined) {
  if (!sessionId || getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please try again.');
  }
}

export function useBusiness() {
  return useQuery({
    queryKey: businessKeys.detail(),
    queryFn: ({signal}) => call(client.GET('/v1/businesses/me', {signal})),
    staleTime: 0,
  });
}

export function useTimezones() {
  return useQuery({
    queryKey: businessKeys.timezones(),
    queryFn: ({signal}) => call(client.GET('/v1/businesses/timezones', {signal})),
    staleTime: Infinity,
  });
}

export function useUpdateBusiness() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: BusinessUpdate) => call(client.PATCH('/v1/businesses/me', {body})),
    onSuccess: async (result, _input, sessionId) => {
      assertSession(sessionId);
      queryClient.setQueryData(businessKeys.detail(), result);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: authKeys.profile()}),
        queryClient.invalidateQueries({queryKey: businessKeys.detail()}),
        queryClient.invalidateQueries({queryKey: weightProgressKeys.all}),
      ]);
      assertSession(sessionId);
    },
  });
}
