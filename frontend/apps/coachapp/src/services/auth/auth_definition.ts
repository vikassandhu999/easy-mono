import axios from 'axios';
import {z} from 'zod';

/* --------- Send Login Code */
export const SendLoginCode_zod = z.object({
    email: z.string().email('Invalid email format'),
});

export interface SendLoginCodeResponse {
    token: {
        token_id: string;
    };
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
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
    refresh_token: string;
}

export type VerifyLoginRequest = z.infer<typeof VerifyLogin_zod>;

/* --------- Register */

export const Register_zod = z.object({
    email: z.string().email('Invalid email format'),
    first_name: z.string().min(2, 'First name is too short.').max(127, 'Name is too long'),
    last_name: z.string().min(2, 'Last name is too short.').max(127, 'Name is too long'),
    business_name: z.string().min(2, 'Business name is too short').max(127, 'Business name is too long'),
    business_handle: z
        .string()
        .min(3, 'Business handle must be at least 3 characters')
        .max(30, 'Business handle must be no more than 30 characters')
        .regex(/^[a-z0-9_-]+$/, 'Business handle can only contain lowercase letters, numbers, hyphens, and underscores')
        .regex(/^[a-z0-9]/, 'Business handle must start with a letter or number')
        .regex(/[a-z0-9]$/, 'Business handle must end with a letter or number'),
});

export interface RegisterResponse {
    token: {
        token_id: string;
    };
    user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
}

export type RegisterRequest = z.infer<typeof Register_zod>;

/* --------- Verify Regiteration */

export const VerifyRegisteration_zod = z.object({
    token_id: z.string(),
    code: z.string().length(6, 'Passcode should contain 6 digits'),
});

export interface VerifyRegisterationResponse {
    access_token: string;
    refresh_token: string;
}

export type VerifyRegisterationRequest = z.infer<typeof VerifyRegisteration_zod>;

/* --------- Refresh Token  */

export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
}

// ------ User Profile

export interface CoachStats {
    total_clients: number;
    total_plans: number;
}

export interface UserProfileResponse {
    coach: {
        id: string;
        business_id: string;
        stats: CoachStats;
    };
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        email_verified: boolean;
    };
}

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

export const clearTokens = () => {
    // Token management removed - using cookie-based authentication
    // Tokens are now stored in HTTP-only cookies and cleared by the backend
};

export const authedClient = axios.create(client.defaults);
