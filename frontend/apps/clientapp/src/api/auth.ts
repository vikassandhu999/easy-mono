import {useMutation, useQuery} from '@tanstack/react-query';
import {clearChallenge} from './challenge';
import {call, client, publicClient} from './client';
import {authKeys} from './keys';
import {queryClient} from './query-client';
import type {ClientProfileUpdate, components} from './schema';
import {getSession, identifySession, saveSession, sessionSnapshot} from './session';

export type {ClientProfile as Profile} from './schema';
export type ProfileUpdate = Pick<ClientProfileUpdate, 'first_name' | 'last_name' | 'phone'>;
export type VerifyRequest = Extract<components['schemas']['VerifyRequest'], {email: string}>;
type Invite = components['schemas']['AcceptInviteRequest'];
type VerifyInvite = components['schemas']['AcceptInviteVerifyRequest'];

export function useStartLogin() {
  return useMutation({
    mutationFn: async (email: string) => {
      await call(publicClient.POST('/v1/auth/otp', {body: {email, type: 'authentication'}}));
      return 'login' as const;
    },
  });
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: authKeys.invitation(token),
    queryFn: ({signal}) => call(publicClient.GET('/v1/auth/invitations/{token}', {params: {path: {token}}, signal})),
    staleTime: 0,
  });
}

export function useAcceptInvitation() {
  return useMutation({mutationFn: (body: Invite) => call(publicClient.POST('/v1/auth/accept-invite', {body}))});
}

export function useVerify() {
  return useMutation({
    onMutate: () => sessionSnapshot(),
    mutationFn: (input: {kind: 'login'; body: VerifyRequest} | {kind: 'invite'; body: VerifyInvite}) =>
      input.kind === 'invite'
        ? call(publicClient.POST('/v1/auth/accept-invite/verify', {body: input.body}))
        : call(publicClient.POST('/v1/auth/token', {body: {...input.body, grant_type: 'otp', role: 'client'}})),
    onSuccess: async (tokens, _input, snapshot) => {
      if (snapshot !== sessionSnapshot()) {
        throw new Error('Your session changed. Please sign in again.');
      }
      await saveSession(tokens);
      await clearChallenge();
    },
  });
}

export function useResend() {
  return useMutation({
    mutationFn: (body: components['schemas']['OtpRequest'] | Invite) =>
      'invitation_token' in body
        ? call(publicClient.POST('/v1/auth/accept-invite', {body}))
        : call(publicClient.POST('/v1/auth/otp', {body})),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: async ({signal}) => {
      const session = getSession();
      if (!session) {
        throw new Error('Please sign in to continue.');
      }
      const result = await call(client.GET('/v1/client/me', {signal}));
      await identifySession(result.data.id, session.id);
      return result;
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ProfileUpdate) => call(client.PATCH('/v1/client/me', {body})),
    onSuccess: async (result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      queryClient.setQueryData(authKeys.profile(), result);
      await queryClient.invalidateQueries({queryKey: authKeys.profile()});
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}
