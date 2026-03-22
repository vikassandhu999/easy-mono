import {api} from '@/api/base';
export {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

export type SignupRequest = {
  email: string;
  first_name?: string;
  last_name?: string;
};

export type SignupResponse = {
  id: string;
  email: string;
  confirmation_sent_at: string;
  inserted_at: string;
  updated_at: string;
};

export type OtpRequest = {
  email: string;
  type: 'authentication' | 'email_confirmation';
};

export type MessageResponse = {
  message: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export type TokenOtpRequest = {
  grant_type: 'otp';
  email: string;
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
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    signup: build.mutation<SignupResponse, SignupRequest>({
      query: (body) => ({
        url: '/v1/auth/signup',
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
    verifyOtp: build.mutation<AuthTokenResponse, VerifyOtpRequest>({
      query: (body) => ({
        url: '/v1/auth/verify',
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

export const {useExchangeTokenMutation, useSendOtpMutation, useSignupMutation, useVerifyOtpMutation} = authApi;
