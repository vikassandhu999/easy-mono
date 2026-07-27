import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {authKeys, businessKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

export {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

type GeneratedTokenRequest = paths['/v1/auth/token']['post']['requestBody']['content']['application/json'];

export type TokenOtpRequest = Extract<GeneratedTokenRequest, {grant_type: 'otp'}>;
export type TokenRefreshRequest = Extract<GeneratedTokenRequest, {grant_type: 'refresh_token'}>;

export type AuthTokenResponse = components['schemas']['AuthTokenResponse'];

export type OtpRequest = components['schemas']['OtpRequest'];
export type SignupRequest = components['schemas']['SignupRequest'];
export type SignupResponse = components['schemas']['SignupResponse'];
export type TrainerAcceptInviteRequest = components['schemas']['TrainerAcceptInviteRequest'];
export type TrainerAcceptInviteVerifyRequest = components['schemas']['TrainerAcceptInviteVerifyRequest'];
export type TrainerInvitationPreviewResponse = components['schemas']['TrainerInvitationPreviewResponse'];
export type BusinessRequest = components['schemas']['BusinessRequest'];
export type BusinessResponse = components['schemas']['BusinessResponse'];

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: (body: VerifyOtpRequest) => call(client.POST('/v1/auth/verify', {body})) as Promise<AuthTokenResponse>,
  });
}

export function useExchangeTokenMutation() {
  return useMutation({
    mutationFn: (body: TokenOtpRequest | TokenRefreshRequest) => call(client.POST('/v1/auth/token', {body})),
  });
}

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: (body: OtpRequest) => call(client.POST('/v1/auth/otp', {body})),
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: (body: SignupRequest) => call(client.POST('/v1/auth/signup', {body})),
  });
}

export function useTrainerAcceptInviteMutation() {
  return useMutation({
    mutationFn: (body: TrainerAcceptInviteRequest) => call(client.POST('/v1/auth/trainer-accept-invite', {body})),
  });
}

export function useTrainerAcceptInviteVerifyMutation() {
  return useMutation({
    mutationFn: (body: TrainerAcceptInviteVerifyRequest) =>
      call(client.POST('/v1/auth/trainer-accept-invite/verify', {body})) as Promise<AuthTokenResponse>,
  });
}

/**
 * Loads the invitation preview shown before OTP verification. Always fetches
 * fresh (no stale cache reuse, no dedupe across mounts) — invitation state can
 * change between visits (revoked, already accepted elsewhere). Replaces the
 * old `refetchOnMountOrArgChange: true` caller option.
 */
export function useShowTrainerInvitationQuery(token: string, options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: authKeys.trainerInvitation(token),
    queryFn: () =>
      call(
        client.GET('/v1/auth/trainer-invitations/{token}', {params: {path: {token}}}),
      ) as Promise<TrainerInvitationPreviewResponse>,
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BusinessRequest) => call(client.POST('/v1/businesses', {body})) as Promise<BusinessResponse>,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: businessKeys.all});
    },
  });
}

export function useGetCurrentBusinessQuery(options?: {enabled?: boolean}) {
  return useQuery({
    queryKey: businessKeys.all,
    queryFn: () => call(client.GET('/v1/businesses/me')) as Promise<BusinessResponse>,
    enabled: options?.enabled ?? true,
  });
}
