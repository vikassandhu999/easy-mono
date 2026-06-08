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

export type AcceptInviteRequest = {
  email: string;
  invitation_token: string;
};

export type AcceptInviteVerifyRequest = {
  email: string;
  invitation_token: string;
  otp: string;
};

export type MessageResponse = {
  message: string;
};

// ── Returning-client login ───────────────────────────────────

/**
 * The /v1/auth/otp endpoint accepts both 'authentication' and 'email_confirmation'
 * types on the backend, but the v2 onboarding flow never needs email_confirmation
 * from the client app — it's inlined into POST /accept-invite. Narrowing the type
 * here prevents callers from accidentally sending the wrong kind.
 */
export type OtpRequest = {
  email: string;
  type: 'authentication';
};

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
     * Phase 1 of acceptance. Validates the invitation and mails a 6-digit OTP
     * to the supplied email. Does NOT mutate — Client stays pending, no User
     * is created or linked. Client completes the flow by posting to
     * /v1/auth/accept-invite/verify.
     */
    acceptInvite: build.mutation<MessageResponse, AcceptInviteRequest>({
      query: (body) => ({
        url: '/v1/auth/accept-invite',
        method: 'POST',
        body,
      }),
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

    sendOtp: build.mutation<MessageResponse, OtpRequest>({
      query: (body) => ({
        url: '/v1/auth/otp',
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

export const {
  useAcceptInviteMutation,
  useAcceptInviteVerifyMutation,
  useExchangeTokenMutation,
  useLookupInvitationQuery,
  useSendOtpMutation,
} = authApi;
