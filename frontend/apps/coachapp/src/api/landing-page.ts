import {useMutation, useQuery} from '@tanstack/react-query';
import {call, client, publicClient} from './client';
import {landingPageKeys, prospectKeys} from './keys';
import {queryClient} from './query-client';
import type {LandingPageApplication, LandingPageUpsert} from './schema';
import {getSession} from './session';

export type {LandingPage, LandingPageApplication, LandingPagePublic, LandingPageUpsert} from './schema';

export function useLandingPage() {
  return useQuery({
    queryKey: landingPageKeys.detail(),
    queryFn: ({signal}) => call(client.GET('/v1/coach/landing-page', {signal})),
    staleTime: 0,
  });
}

export function useSaveLandingPage() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: LandingPageUpsert) => call(client.PUT('/v1/coach/landing-page', {body})),
    onSuccess: async (result, _body, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      queryClient.setQueryData(landingPageKeys.detail(), result);
      await queryClient.invalidateQueries({queryKey: landingPageKeys.all});
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}

export function usePublicLandingPage(slug: string) {
  return useQuery({
    queryKey: landingPageKeys.public(slug),
    queryFn: ({signal}) => call(publicClient.GET('/v1/public/landing-pages/{slug}', {params: {path: {slug}}, signal})),
    staleTime: 0,
    retry: false,
  });
}

export function useApplyForCoaching(slug: string) {
  return useMutation({
    mutationFn: (body: LandingPageApplication) =>
      call(publicClient.POST('/v1/public/landing-pages/{slug}/applications', {params: {path: {slug}}, body})),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({queryKey: landingPageKeys.public(slug)}),
        queryClient.invalidateQueries({queryKey: prospectKeys.lists()}),
      ]),
  });
}
