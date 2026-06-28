import {api} from '@/api/base';
import {type ApiResponse} from '@/api/shared';

// ── Invitation lookup (public, pre-auth) ─────────────────────

/**
 * State-discriminated body returned by GET /v1/auth/invitations/:token.
 * Only the `pending` branch carries business/coach details — the other three
 * states intentionally omit them so used/expired/invalid tokens don't leak
 * which business they belonged to.
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

export type AcceptInviteVerifyRequest = {
  email: string;
  invitation_token: string;
  otp: string;
};

// ── Returning-client login ───────────────────────────────────

export type TokenOtpRequest = {
  email: string;
  grant_type: 'otp';
  otp: string;
  role: 'client' | 'coach' | 'guest' | 'owner';
};

export type TokenRefreshRequest = {
  grant_type: 'refresh_token';
  refresh_token: string;
  role?: 'client' | 'coach' | 'guest' | 'owner';
};

export type AuthTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Public lookup for Screen 1. Always returns 200 — switch on data.state.
     * Used to render the welcome form or a state-specific "already used /
     * expired / invalid" screen.
     */
    lookupInvitation: build.query<ApiResponse<InvitationLookup>, string>({
      query: (token) => `/v1/auth/invitations/${token}`,
    }),

    /**
     * Phase 2 of acceptance. Verifies the OTP against the (token, email, otp)
     * tuple. On success, atomically creates/links the User, flips the Client
     * to active, and issues a scope=client session.
     */
    acceptInviteVerify: build.mutation<AuthTokenResponse, AcceptInviteVerifyRequest>({
      query: (body) => ({
        url: '/v1/auth/accept-invite/verify',
        method: 'POST',
        body,
      }),
    }),

    exchangeToken: build.mutation<AuthTokenResponse, TokenOtpRequest | TokenRefreshRequest>({
      query: (body) => ({
        url: '/v1/auth/token',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {useAcceptInviteVerifyMutation, useExchangeTokenMutation, useLookupInvitationQuery} = authApi;
