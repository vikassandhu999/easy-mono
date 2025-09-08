import {Result} from '@/Utils/Error';
import axios, {AxiosInstance} from 'axios';
import {z} from 'zod';

// auth schemas
export const SignInRequest_zod = z.object({
    email: z.string().email(),
    invitation_token: z.string().optional(),
});

export const SignInCodeRequest_zod = z.object({
    token_id: z.string(),
    passcode: z.string(),
    invitation_token: z.string().optional(),
});

export const LoginRequest_zod = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const RequestPasswordResetRequest_zod = z.object({
    email: z.string().email(),
});

export const ResetPasswordRequest_zod = z.object({
    email: z.string().email(),
    reset_code: z.string(),
    new_password: z.string().min(6),
    confirm_password: z.string(),
});

export const SetPasswordRequest_zod = z.object({
    password: z.string().min(6),
    confirm_password: z.string(),
});

export const CompleteProfileRequest_zod = z.object({
    name: z.string().min(2).max(100).optional(),
    notes: z.string().max(1000).optional(),
});


// Types
export type SignInRequest = z.infer<typeof SignInRequest_zod>;
export type SignInCodeRequest = z.infer<typeof SignInCodeRequest_zod>;
export type LoginRequest = z.infer<typeof LoginRequest_zod>;
export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetRequest_zod>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest_zod>;
export type SetPasswordRequest = z.infer<typeof SetPasswordRequest_zod>;
export type CompleteProfileRequest = z.infer<typeof CompleteProfileRequest_zod>;


// API Response Interfaces
export interface LoginResponse {
    token_id: string;
    auth_flow: string;
    is_new_user: boolean;
    client_status: string;
    message: string;
}

export interface ApiUser {
    id: string;
    email: string;
}

export interface ApiClient {
    id: string;
    name: string;
}

export interface AccessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
    user: ApiUser;
    client?: ApiClient;
    auth_flow: string;
    is_new_client: boolean;
    needs_onboarding: boolean;
}

let baseURL: string = import.meta.env.VITE_API_BASE_URL;
if (window.origin.startsWith('http://')) {
    baseURL = window.origin.replace(':2020', ':8080').replace(':42711', ':8080',);
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
    // POST /v1/client/login
    signIn: async (data: SignInRequest): Promise<Result<LoginResponse>> => {
        try {
            const response = await client.post('/v1/client/login', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/client/token (grant_type: passcode)
    signInCode: async (data: SignInCodeRequest): Promise<Result<AccessTokenResponse>> => {
        try {
            const response = await client.post(
                '/v1/client/token',
                {
                    grant_type: 'passcode',
                    ...data,
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

    // POST /v1/client/token (grant_type: password)
    login: async (data: LoginRequest): Promise<Result<AccessTokenResponse>> => {
        try {
            const response = await client.post(
                '/v1/client/token',
                {
                    grant_type: 'password',
                    ...data,
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

    // POST /v1/client/token (grant_type: refresh_token)
    refreshToken: async (): Promise<Result<AccessTokenResponse>> => {
        try {
            const response = await client.post(
                '/v1/client/token',
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

    // POST /v1/client/logout
    logout: async (): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.post('/v1/client/logout');
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/client/password/reset/request
    requestPasswordReset: async (data: RequestPasswordResetRequest): Promise<Result<{message: string}>> => {
        try {
            const response = await client.post('/v1/client/password/reset/request', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/client/password/reset/confirm
    resetPassword: async (data: ResetPasswordRequest): Promise<Result<{message: string}>> => {
        try {
            const response = await client.post('/v1/client/password/reset/confirm', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/client/password/set
    setPassword: async (data: SetPasswordRequest): Promise<Result<{message: string}>> => {
        try {
            const response = await authedClient.post('/v1/client/password/set', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },

    // POST /v1/client/profile/complete
    completeProfile: async (data: CompleteProfileRequest): Promise<Result<{message: string, client: ApiClient}>> => {
        try {
            const response = await authedClient.post('/v1/client/profile/complete', data);
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
