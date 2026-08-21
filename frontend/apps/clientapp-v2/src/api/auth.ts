import {useMutation, useQuery} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import {authKeys} from '@/api/keys';
import type {components, paths} from '@/api/schema';

// ── Invitation lookup (public, pre-auth) ─────────────────────

/**
 * State-discriminated body returned by GET /v1/auth/invitations/:token.
 * Only the `pending` branch carries business/coach details — the other three
 * states intentionally omit them so used/expired/invalid tokens don't leak
 * which business they belonged to. The spec types every field as nullable, so
 * this hand-written union is what gives callers real narrowing.
 */
export type InvitationLookup =
  | {
      business_name: string;
      coach_first_name: string;
      expires_at: string;
      prefill_email: null | string;
      state: 'pending';
    }
  | {state: 'expired'}
  | {state: 'invalid'}
  | {state: 'used'};

// ── Two-phase invitation acceptance ──────────────────────────

type AcceptInviteRequest = components['schemas']['AcceptInviteRequest'];
type AcceptInviteVerifyRequest = components['schemas']['AcceptInviteVerifyRequest'];
type OtpRequest = components['schemas']['OtpRequest'];

// ── Returning-client login ───────────────────────────────────

type TokenRequest = paths['/v1/auth/token']['post']['requestBody']['content']['application/json'];

type TokenOtpRequest = Extract<TokenRequest, {grant_type: 'otp'}>;
type TokenRefreshRequest = Extract<TokenRequest, {grant_type: 'refresh_token'}>;

// ── Hooks ────────────────────────────────────────────────────

/**
 * Public lookup for Screen 1. Always returns 200 — switch on data.state.
 * Used to render the welcome form or a state-specific "already used /
 * expired / invalid" screen. Always refetches: invitation state can change
 * between visits (revoked, accepted elsewhere).
 */
export function useLookupInvitationQuery(token: string) {
  return useQuery({
    queryKey: authKeys.invitation(token),
    queryFn: async () => {
      const body = await call(client.GET('/v1/auth/invitations/{token}', {params: {path: {token}}}));
      return body as {data: InvitationLookup};
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Phase 1 of acceptance — sends the OTP to the invited email. */
export function useAcceptInviteMutation() {
  return useMutation({
    mutationFn: (body: AcceptInviteRequest) => call(client.POST('/v1/auth/accept-invite', {body})),
  });
}

/**
 * Phase 2 of acceptance. Verifies the OTP against the (token, email, otp)
 * tuple. On success, atomically creates/links the User, flips the Client
 * to active, and issues a scope=client session.
 */
export function useAcceptInviteVerifyMutation() {
  return useMutation({
    mutationFn: (body: AcceptInviteVerifyRequest) => call(client.POST('/v1/auth/accept-invite/verify', {body})),
  });
}

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: (body: OtpRequest) => call(client.POST('/v1/auth/otp', {body})),
  });
}

export function useExchangeTokenMutation() {
  return useMutation({
    mutationFn: (body: TokenOtpRequest | TokenRefreshRequest) => call(client.POST('/v1/auth/token', {body})),
  });
}
