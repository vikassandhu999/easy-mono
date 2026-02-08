import { baseAPISlice } from "../baseAPISlice";
import {
  type AuthTokenResponse,
  type MessageResponse,
  type SendOtpRequest,
  type SignupRequest,
  type SignupResponse,
  type TokenOtpRequest,
  type TokenRefreshRequest,
  type VerifyOtpRequest,
  type VerifyTokenRequest,
} from "./auth_definition";

export const authApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * POST /v1/auth/signup
     * Sign up a new user. Returns user stub with confirmation_sent_at.
     */
    signup: build.mutation<SignupResponse, SignupRequest>({
      query: (body) => ({
        url: "/v1/auth/signup",
        method: "post",
        data: body,
      }),
    }),

    /**
     * POST /v1/auth/otp
     * Send an OTP to the user's email for authentication or email confirmation.
     */
    sendOtp: build.mutation<MessageResponse, SendOtpRequest>({
      query: (body) => ({
        url: "/v1/auth/otp",
        method: "post",
        data: body,
      }),
    }),

    /**
     * POST /v1/auth/verify
     * Verify a token (email confirmation link) or OTP.
     * Accepts either { token } or { email, otp }.
     */
    verify: build.mutation<
      AuthTokenResponse,
      VerifyTokenRequest | VerifyOtpRequest
    >({
      query: (body) => ({
        url: "/v1/auth/verify",
        method: "post",
        data: body,
      }),
    }),

    /**
     * POST /v1/auth/token
     * Exchange credentials for access/refresh tokens.
     * Accepts either TokenOtpRequest (grant_type: "otp") or
     * TokenRefreshRequest (grant_type: "refresh_token").
     */
    exchangeToken: build.mutation<
      AuthTokenResponse,
      TokenOtpRequest | TokenRefreshRequest
    >({
      query: (body) => ({
        url: "/v1/auth/token",
        method: "post",
        data: body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useExchangeTokenMutation,
  useSendOtpMutation,
  useSignupMutation,
  useVerifyMutation,
} = authApi;
