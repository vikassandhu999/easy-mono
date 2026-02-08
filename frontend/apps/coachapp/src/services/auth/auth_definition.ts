import { z } from "zod";

export type AuthRole = "client" | "coach" | "guest" | "owner";

/* --------- Signup: POST /v1/auth/signup */
export interface SignupRequest {
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface SignupResponse {
  confirmation_sent_at: string;
  email: string;
  id: string;
  inserted_at: string;
  updated_at: string;
}

/* --------- OTP: POST /v1/auth/otp */
export interface SendOtpRequest {
  email: string;
  type: "authentication" | "email_confirmation";
}

export interface MessageResponse {
  message: string;
}

/* --------- Verify: POST /v1/auth/verify (oneOf token | otp) */
export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

/* --------- Token exchange: POST /v1/auth/token (oneOf refresh | otp) */
export interface TokenRefreshRequest {
  grant_type: "refresh_token";
  refresh_token: string;
  role?: AuthRole;
}

export interface TokenOtpRequest {
  email: string;
  grant_type: "otp";
  otp: string;
  role: AuthRole;
}

/* --------- Shared auth token response */
export interface AuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

/* --------- Form validation schemas (Zod for zodResolver only) */
export const SendOtp_zod = z.object({
  email: z.string().email("Invalid email format"),
});

export const VerifyOtp_zod = z.object({
  email: z.string().email("Invalid email format"),
  grant_type: z.literal("otp"),
  otp: z.string().length(6, "Passcode should contain 6 digits"),
  role: z.enum(["client", "coach", "guest", "owner"]),
});

export const Signup_zod = z.object({
  email: z.string().email("Invalid email format"),
  first_name: z
    .string()
    .min(2, "First name is too short.")
    .max(255, "First name is too long"),
  last_name: z
    .string()
    .min(2, "Last name is too short.")
    .max(255, "Last name is too long"),
});

export interface SignupFormValues {
  email: string;
  first_name: string;
  last_name: string;
}
