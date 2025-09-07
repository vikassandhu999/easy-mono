import {Result} from '@/Utils/Error';
import axios, {AxiosInstance} from 'axios';
import {z} from 'zod';

// Auth schemas
export const SignupRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

export const VerifySignupRequest_zod = z.object({
    token_id: z.string(),
    passcode: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
});

export const SignInRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

export const SignInCodeRequest_zod = z.object({
    token_id: z.string(),
    passcode: z.string(),
    email: z.string().email(),
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
    token_id: z.string(),
    passcode: z.string(),
    password: z.string().min(6),
});

export const SendPasscodeRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

// Types
export type SignupRequest = z.infer<typeof SignupRequest_zod>;
export type VerifySignupRequest = z.infer<typeof VerifySignupRequest_zod>;
export type SignInRequest = z.infer<typeof SignInRequest_zod>;
export type SignInCodeRequest = z.infer<typeof SignInCodeRequest_zod>;
export type LoginProps = z.infer<typeof LoginRequest_zod>;
export type ResendVerifyRequest = z.infer<typeof ResendVerifyRequest_zod>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequest_zod>;
export type PasswordConfirmRequest = z.infer<typeof PasswordConfirmRequest_zod>;
export type SendPasscodeRequest = z.infer<typeof SendPasscodeRequest_zod>;

// Interfaces
export interface AccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export interface TokenValidation {
    token_id: string;
    email: string;
    expires_at: string;
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

const addAuthInterceptor = (instance: AxiosInstance) => {
    instance.interceptors.request.use((config) => {
        if (instance.defaults.authToken && config.headers && !config.skipAuth) {
            config.headers.Authorization = `Bearer ${instance.defaults.authToken}`;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    const authToken = await AuthAPI.refreshToken();
                    instance.defaults.authToken = authToken.getValue().access_token;
                } catch (e) {
                    return Promise.reject(error);
                }
                originalRequest.headers.Authorization = `Bearer ${instance.defaults.authToken}`;
                return axios(originalRequest);
            }
            return Promise.reject(error);
        },
    );
    return instance;
};

export const setTokenForAuthedClient = (token: string) => {
    authedClient.defaults.authToken = token;
};

export const authedClient = addAuthInterceptor(axios.create(client.defaults));

export const AuthAPI = {
    // POST /v1/auth/signup
    signup: async (data: SignupRequest): Promise<Result<TokenValidation>> => {
        try {
            const response = await client.post('/v1/auth/signup', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/verify
    verifySignup: async (data: VerifySignupRequest): Promise<Result<AccessToken>> => {
        try {
            const response = await client.post('/v1/auth/verify', data, {
                withCredentials: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/signin
    signIn: async (data: SignInRequest): Promise<Result<TokenValidation>> => {
        try {
            const response = await client.post('/v1/auth/send-passcode', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/token (grant_type: passcode)
    signInCode: async (data: SignInCodeRequest): Promise<Result<AccessToken>> => {
        try {
            const response = await client.post(
                '/v1/auth/token',
                {
                    grant_type: 'passcode',
                    token_id: data.token_id,
                    passcode: data.passcode,
                    email: data.email,
                },
                {
                    withCredentials: true,
                },
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/token (grant_type: password)
    login: async (data: LoginProps): Promise<Result<AccessToken>> => {
        try {
            const response = await client.post(
                '/v1/auth/token',
                {
                    grant_type: 'password',
                    email: data.email,
                    password: data.password,
                },
                {
                    withCredentials: true,
                },
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/token (grant_type: refresh_token)
    refreshToken: async (): Promise<Result<AccessToken>> => {
        try {
            const response = await client.post(
                '/v1/auth/token',
                {
                    grant_type: 'refresh_token',
                },
                {
                    withCredentials: true,
                },
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/logout
    logout: async (): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.post('/v1/auth/logout');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/verify-resend
    resendVerifyCode: async (data: ResendVerifyRequest): Promise<Result<TokenValidation>> => {
        try {
            const response = await client.post('/v1/auth/verify-resend', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/password-reset
    passwordReset: async (data: PasswordResetRequest): Promise<Result<TokenValidation>> => {
        try {
            const response = await client.post('/v1/auth/password-reset', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/password-confirm
    passwordConfirm: async (data: PasswordConfirmRequest): Promise<Result<AccessToken>> => {
        try {
            const response = await client.post('/v1/auth/password-confirm', data, {
                withCredentials: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/auth/send-passcode
    sendPasscode: async (data: SendPasscodeRequest): Promise<Result<TokenValidation>> => {
        try {
            const response = await client.post('/v1/auth/send-passcode', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
