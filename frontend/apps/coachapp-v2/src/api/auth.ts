import {api} from '@/api/base';

export {clearTokens, getAccessToken, getRefreshToken, getTokenExpiresAt, setTokens} from '@/api/authStorage';

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

const authApi = api.injectEndpoints({
  endpoints: (build) => ({
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

export const {useExchangeTokenMutation, useVerifyOtpMutation} = authApi;
