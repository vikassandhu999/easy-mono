import axios from 'axios';
import {z} from 'zod';

// auth schemas
export const RegisterRequest_zod = z.object({
    email: z.string().email('Invalid email format'),
    full_name: z.string().min(2, 'Name should greator than 2 letters').max(127, 'Name is too long'),
});

export type RegisterRequest = z.infer<typeof RegisterRequest_zod>;

export const SignInRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

export const SignInCodeRequest_zod = z.object({
    email: z.string().email(),
    passcode: z.string(),
    token_id: z.string(),
});

export const LoginRequest_zod = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const ResendVerifyRequest_zod = z.object({
    token_id: z.string(),
});

export const PasswordResetRequest_zod = z.object({
    email: z.string().email(),
});

export const PasswordConfirmRequest_zod = z.object({
    passcode: z.string(),
    password: z.string().min(6),
    token_id: z.string(),
});

export const SendPasscodeRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

export const SendOTPRequest_zod = z.object({
    email: z.string().email('Invalid email format'),
    type: z.enum(['registration', 'login']),
});

export type SendOTPRequest = z.infer<typeof SendOTPRequest_zod>;

export const VerifyOTPRequest_zod = z.object({
    token_id: z.string().min(1, 'Token ID is required'),
    code: z.string().length(6, 'Code must be 6 digits'),
});

export type VerifyOTPRequest = z.infer<typeof VerifyOTPRequest_zod>;

// Phone authentication schemas
export const SendPhoneLoginOTPRequest_zod = z.object({
    phone_number: z.string().min(1),
});

export const VerifyPhoneLoginOTPRequest_zod = z.object({
    otp: z.string().length(6),
    phone_number: z.string().min(1),
    token_id: z.string(),
});

export const RegisterWithPhoneRequest_zod = z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    otp: z.string().length(6),
    phone_number: z.string().min(1),
    token_id: z.string(),
});

// Interfaces
export interface AccessToken {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}
export type LoginProps = z.infer<typeof LoginRequest_zod>;
export type PasswordConfirmRequest = z.infer<typeof PasswordConfirmRequest_zod>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequest_zod>;
export type RegisterWithPhoneRequest = z.infer<typeof RegisterWithPhoneRequest_zod>;
export type ResendVerifyRequest = z.infer<typeof ResendVerifyRequest_zod>;
export type SendPasscodeRequest = z.infer<typeof SendPasscodeRequest_zod>;
export type SendPhoneLoginOTPRequest = z.infer<typeof SendPhoneLoginOTPRequest_zod>;
export type SignInCodeRequest = z.infer<typeof SignInCodeRequest_zod>;
export type SignInRequest = z.infer<typeof SignInRequest_zod>;

export interface TokenValidation {
    email: string;
    expires_at: string;
    token_id: string;
}

export interface RegisterResponse {
    expires_at: string;
    status: string;
    token_id: string;
}

export interface SendOTPResponse {
    expires_at: string;
    status: string;
    token_id: string;
}

/**
 * Coach-specific profile information.
 * Present when the user has the 'coach' role.
 */
export interface CoachProfile {
    /** Optional biography or description */
    bio: null | string;
    /** Associated business identifier */
    business_id: string;
    /** Additional credentials or certifications as key-value pairs */
    credentials: Record<string, unknown>;
    /** Unique identifier for the coach profile */
    id: string;
    /** Array of specialties or areas of expertise */
    specialties: string[];
    /** Current status of the coach (e.g., 'active', 'inactive') */
    status: string;
}

/**
 * Client-specific profile information.
 * Present when the user has the 'client' role.
 */
export interface ClientProfile {
    /** Associated business identifier */
    business_id: string;
    /** Unique identifier for the client profile */
    id: string;
    /** Optional notes about the client */
    notes: null | string;
    /** Optional phone number */
    phone: null | string;
    /** Current status of the client (e.g., 'active', 'inactive') */
    status: string;
}

/**
 * Complete user profile data returned from authentication endpoints.
 * Includes base user information and optional role-specific profiles.
 */
export interface User {
    /** Client profile data, present only if user has 'client' role */
    client_profile?: ClientProfile;
    /** Coach profile data, present only if user has 'coach' role */
    coach_profile?: CoachProfile;
    /** User's email address */
    email: string;
    /** Whether the user's email has been verified */
    email_verified: boolean;
    /** User's full name */
    full_name: string;
    /** Unique identifier for the user */
    id: string;
    /** Array of user roles (e.g., ['coach'], ['client'], or both) */
    roles: string[];
}

/**
 * Session data containing authentication tokens and expiration information.
 * Note: With cookie-based authentication, tokens are stored in HTTP-only cookies.
 */
export interface SessionData {
    /** JWT access token for API authentication */
    access_token: string;
    /** ISO 8601 timestamp when the session expires */
    expires_at: string;
    /** Number of seconds until the access token expires */
    expires_in: number;
    /** Optional refresh token (stored in HTTP-only cookie) */
    refresh_token?: string;
}

/**
 * Response from the OTP verification endpoint.
 * Returns complete user profile after successful OTP verification.
 * Tokens are stored in HTTP-only cookies and not included in response body.
 */
export interface VerifyOTPResponse {
    /** Complete user profile with roles and associated profiles */
    user: User;
}

/**
 * Response from the token refresh endpoint.
 * Returns updated user profile and new access token.
 * Tokens are stored in HTTP-only cookies and not included in response body.
 */
export interface RefreshResponse {
    /** Complete user profile with roles and associated profiles */
    user: User;
}

export type VerifyPhoneLoginOTPRequest = z.infer<typeof VerifyPhoneLoginOTPRequest_zod>;

let baseURL: string = import.meta.env.VITE_API_BASE_URL;
if (window.origin.startsWith('http://')) {
    baseURL = window.origin.replace(':2020', ':8080');
}

export const client = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

export const setTokenForAuthedClient = (_accessToken: string, _refreshToken?: string) => {
    // Token management removed - using cookie-based authentication
    // This function is kept for backward compatibility but does nothing
    // Tokens are now stored in HTTP-only cookies by the backend
};

export const getRefreshToken = (): null | string => {
    // Token management removed - using cookie-based authentication
    // Refresh token is now stored in HTTP-only cookies by the backend
    return null;
};

export const clearTokens = () => {
    // Token management removed - using cookie-based authentication
    // Tokens are now stored in HTTP-only cookies and cleared by the backend
};

export const authedClient = axios.create(client.defaults);
