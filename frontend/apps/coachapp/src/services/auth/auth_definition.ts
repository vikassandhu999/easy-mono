import axios from 'axios';
import {z} from 'zod';

import {logger} from '@/utils/logger';

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
    first_name: z.string().min(2, 'First name is too short.').max(255, 'First name is too long'),
    last_name: z.string().min(2, 'Last name is too short.').max(255, 'Last name is too long'),
    business_name: z.string().min(2, 'Business name is too short').max(255, 'Business name is too long'),
    business_handle: z
        .string()
        .min(2, 'Business handle must be at least 2 characters')
        .max(32, 'Business handle must be no more than 32 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Business handle can only contain letters, numbers, hyphens, and underscores'),
});

/* --------- Personal Info (Step 1) */
export const PersonalInfo_zod = z.object({
    email: z.string().email('Invalid email format'),
    first_name: z.string().min(2, 'First name is too short.').max(255, 'First name is too long'),
    last_name: z.string().min(2, 'Last name is too short.').max(255, 'Last name is too long'),
});

export type PersonalInfoRequest = z.infer<typeof PersonalInfo_zod>;

/* --------- Business Info (Step 2) */
export const BusinessInfo_zod = z.object({
    business_name: z.string().min(2, 'Business name is too short').max(255, 'Business name is too long'),
    business_handle: z
        .string()
        .min(2, 'Business handle must be at least 2 characters')
        .max(32, 'Business handle must be no more than 32 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Business handle can only contain letters, numbers, hyphens, and underscores'),
});

export type BusinessInfoRequest = z.infer<typeof BusinessInfo_zod>;

/* --------- Check Email Availability */
export const CheckEmail_zod = z.object({
    email: z.string().email('Invalid email format'),
});

export interface CheckEmailResponse {
    available: boolean;
}

export type CheckEmailRequest = z.infer<typeof CheckEmail_zod>;

/* --------- Check Handle Availability */
export const CheckHandle_zod = z.object({
    handle: z.string().min(2).max(32),
});

export interface CheckHandleResponse {
    available: boolean;
}

export type CheckHandleRequest = z.infer<typeof CheckHandle_zod>;

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
        bio: null | string;
        specialties: string[];
        instagram_url: null | string;
        facebook_url: null | string;
        youtube_url: null | string;
        x_url: null | string;
        years_of_experience: null | number;
        certifications: string[];
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

// Helper to count words in a string
const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
};

// Update Coach Profile
export const UpdateCoachProfile_zod = z.object({
    first_name: z.string().min(1, 'First name is required').max(127),
    last_name: z.string().min(1, 'Last name is required').max(127),
    bio: z
        .string()
        .optional()
        .nullable()
        .refine((val) => !val || countWords(val) <= 200, {
            message: 'Bio cannot exceed 200 words',
        }),
    specialties: z
        .array(z.string())
        .max(6, 'Maximum 6 specialties allowed')
        .optional(),
    instagram_url: z
        .string()
        .url('Please enter a valid URL')
        .optional()
        .nullable()
        .or(z.literal('')),
    facebook_url: z
        .string()
        .url('Please enter a valid URL')
        .optional()
        .nullable()
        .or(z.literal('')),
    youtube_url: z
        .string()
        .url('Please enter a valid URL')
        .optional()
        .nullable()
        .or(z.literal('')),
    x_url: z
        .string()
        .url('Please enter a valid URL')
        .optional()
        .nullable()
        .or(z.literal('')),
    years_of_experience: z
        .number()
        .int()
        .min(0, 'Years of experience must be 0 or greater')
        .optional()
        .nullable(),
    certifications: z.array(z.string()).optional(),
});

export type UpdateCoachProfileRequest = z.infer<typeof UpdateCoachProfile_zod>;

export interface UpdateCoachProfileResponse {
    message: string;
    status: string;
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

/**
 * Resolve the API base URL based on environment
 */
const resolveAuthBaseUrl = (): string => {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

    // In development with http://, auto-detect and replace port for local dev
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.origin.startsWith('http://')) {
        return window.origin.replace(':2020', ':8080');
    }

    // Use environment variable (required in production)
    if (!envBaseUrl) {
        logger.warn('VITE_API_BASE_URL is not set for auth client, using default');
        return 'http://localhost:8080';
    }

    return envBaseUrl;
};

const baseURL = resolveAuthBaseUrl();

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
