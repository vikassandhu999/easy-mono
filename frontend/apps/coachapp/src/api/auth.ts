import {useMutation, useQuery} from '@tanstack/react-query';
import {ApiError, call, client, publicClient, refreshSession} from './client';
import {authKeys} from './keys';
import {queryClient} from './query-client';
import type {CoachProfileUpdate, components, paths} from './schema';
import {getSession, saveSession, sessionSnapshot} from './session';

export type {CoachProfile as Profile} from './schema';
export type ProfileUpdate = Pick<CoachProfileUpdate, 'full_name' | 'preferred_name' | 'phone'>;

export type SignupRequest = components['schemas']['SignupRequest'];
export type VerifyRequest = Extract<components['schemas']['VerifyRequest'], {email: string}>;
type Invite = components['schemas']['TrainerAcceptInviteRequest'];
type VerifyInvite = components['schemas']['TrainerAcceptInviteVerifyRequest'];
export type BusinessInput = paths['/v1/businesses']['post']['requestBody']['content']['application/json'];

export function useStartLogin() {
  return useMutation({
    mutationFn: async (email: string) => {
      try {
        await call(publicClient.POST('/v1/auth/otp', {body: {email, type: 'authentication'}}));
        return 'login' as const;
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'email_not_confirmed') {
          throw error;
        }
        await call(publicClient.POST('/v1/auth/otp', {body: {email, type: 'email_confirmation'}}));
        return 'signup' as const;
      }
    },
  });
}

export function useSignup() {
  return useMutation({mutationFn: (body: SignupRequest) => call(publicClient.POST('/v1/auth/signup', {body}))});
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: authKeys.invitation(token),
    queryFn: () => call(publicClient.GET('/v1/auth/trainer-invitations/{token}', {params: {path: {token}}})),
    enabled: Boolean(token),
    staleTime: 0,
  });
}

export function useAcceptInvitation() {
  return useMutation({mutationFn: (body: Invite) => call(publicClient.POST('/v1/auth/trainer-accept-invite', {body}))});
}

type Verification =
  | {kind: 'login'; body: VerifyRequest}
  | {kind: 'signup'; body: VerifyRequest}
  | {kind: 'invite'; body: VerifyInvite}
  | {kind: 'link'; token: string};

export function useVerify() {
  return useMutation({
    onMutate: () => sessionSnapshot(),
    mutationFn: async (input: Verification) => {
      switch (input.kind) {
        case 'signup':
          return call(publicClient.POST('/v1/auth/verify', {body: input.body}));
        case 'link':
          return call(publicClient.POST('/v1/auth/verify', {body: {token: input.token}}));
        case 'invite':
          return call(publicClient.POST('/v1/auth/trainer-accept-invite/verify', {body: input.body}));
        case 'login': {
          try {
            return await call(
              publicClient.POST('/v1/auth/token', {body: {...input.body, grant_type: 'otp', role: 'coach'}}),
            );
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 403 || error.code !== 'unauthorized') {
              throw error;
            }
            return call(publicClient.POST('/v1/auth/token', {body: {...input.body, grant_type: 'otp', role: 'guest'}}));
          }
        }
      }
    },
    onSuccess: (tokens, _input, snapshot) => {
      if (snapshot !== sessionSnapshot()) {
        throw new Error('Your session changed. Please sign in again.');
      }
      saveSession(tokens);
      sessionStorage.removeItem('coachapp.challenge.v1');
    },
  });
}

export function useResend() {
  return useMutation({
    mutationFn: (body: components['schemas']['OtpRequest'] | Invite) => {
      if ('invitation_token' in body) {
        return call(publicClient.POST('/v1/auth/trainer-accept-invite', {body}));
      }
      return call(publicClient.POST('/v1/auth/otp', {body}));
    },
  });
}

async function resumeBusiness() {
  if (getSession()?.tokens.scope === 'coach') {
    return true;
  }
  try {
    const session = await refreshSession({role: 'coach'});
    return session?.tokens.scope === 'coach';
  } catch (error) {
    if (error instanceof ApiError && error.status === 403 && error.code === 'unauthorized') {
      return false;
    }
    throw error;
  }
}

export function useSetup() {
  return useQuery({queryKey: authKeys.setup(), queryFn: resumeBusiness, staleTime: 0, refetchOnWindowFocus: false});
}

export function useCreateBusiness() {
  return useMutation({
    mutationFn: async (body: BusinessInput) => {
      if (!(await resumeBusiness())) {
        await call(client.POST('/v1/businesses', {body}));
        await refreshSession({role: 'coach'});
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: authKeys.all});
    },
  });
}

export function useProfile() {
  return useQuery({queryKey: authKeys.profile(), queryFn: ({signal}) => call(client.GET('/v1/coach/me', {signal}))});
}

export function useUpdateProfile() {
  return useMutation({
    onMutate: () => getSession()?.id,
    mutationFn: (body: ProfileUpdate) => call(client.PATCH('/v1/coach/me', {body})),
    onSuccess: async (result, _input, sessionId) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
      queryClient.setQueryData(authKeys.profile(), result);
      await queryClient.invalidateQueries({queryKey: authKeys.profile()});
      if (!sessionId || getSession()?.id !== sessionId) {
        throw new Error('Your session changed. Please try again.');
      }
    },
  });
}
