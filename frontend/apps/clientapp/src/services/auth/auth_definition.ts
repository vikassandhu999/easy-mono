import {z} from 'zod';

/* --------- Send Login Code (Email OTP) */
export const SendLoginCode_zod = z.object({
  email: z.string().email('Invalid email format'),
});

export interface SendLoginCodeResponse {
  message?: string;
  token: {
    token_id: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

export type SendLoginCodeRequest = z.infer<typeof SendLoginCode_zod>;

/* --------- Verify Login Code */
export const VerifyLogin_zod = z.object({
  token_id: z.string(),
  code: z.string().length(6, 'Passcode should contain 6 digits'),
});

export interface VerifyLoginResponse {
  access_token: string;
  client?: {
    id: string;
    name: string;
    status: string;
    business_id: string;
  };
  refresh_token: string;
  user: {
    id: string;
    email?: string;
    phone_number?: string;
  };
}

export type VerifyLoginRequest = z.infer<typeof VerifyLogin_zod>;

/* --------- Client Signup (with invitation token) */
export const ClientSignup_zod = z.object({
  token_id: z.string(),
  code: z.string().length(6, 'Passcode should contain 6 digits'),
  invitation_token: z.string(),
});

export interface ClientSignupResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
  user: {
    id: string;
    email?: string;
    phone_number?: string;
    client: {
      id: string;
      name: string;
      status: string;
      business_id: string;
    };
  };
}

export type ClientSignupRequest = z.infer<typeof ClientSignup_zod>;

/* --------- Public Join Signup (with public join code) */
export const PublicJoinSignup_zod = z.object({
  token_id: z.string(),
  code: z.string().length(6, 'Passcode should contain 6 digits'),
  public_join_code: z.string(),
  name: z.string().min(1, 'Name is required').optional(),
});

export interface PublicJoinSignupResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
  user: {
    id: string;
    email?: string;
    phone_number?: string;
    client: {
      id: string;
      name: string;
      status: string;
      business_id: string;
    };
  };
}

export type PublicJoinSignupRequest = z.infer<typeof PublicJoinSignup_zod>;

/* --------- Refresh Token */
export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

/* --------- User Profile */
export interface ClientProfile {
  business?: {
    id: string;
    name: string;
    handle: string;
  };
  business_id: string;
  id: string;
  name: string;
  status: string;
}

export interface UserProfileResponse {
  client: ClientProfile;
  user: {
    id: string;
    email?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
  };
}

/* --------- Send Email Verification (for signup flow) */
export const SendEmailVerification_zod = z.object({
  email: z.string().email('Invalid email format'),
  invitation_token: z.string().optional(),
  public_join_code: z.string().optional(),
});

export interface SendEmailVerificationResponse {
  message?: string;
  token: {
    token_id: string;
  };
}

export type SendEmailVerificationRequest = z.infer<typeof SendEmailVerification_zod>;

/* --------- Send Invitation Code (for invitation acceptance flow) */
export const SendInvitationCode_zod = z.object({
  email: z.string().email('Invalid email format'),
  invitation_token: z.string(),
});

export interface SendInvitationCodeResponse {
  token: {
    token_id: string;
  };
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export type SendInvitationCodeRequest = z.infer<typeof SendInvitationCode_zod>;

/* --------- Send Public Join Code (for public join flow) */
export const SendPublicJoinCode_zod = z.object({
  email: z.string().email('Invalid email format'),
  public_join_code: z.string(),
});

export interface SendPublicJoinCodeResponse {
  token: {
    token_id: string;
  };
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export type SendPublicJoinCodeRequest = z.infer<typeof SendPublicJoinCode_zod>;
