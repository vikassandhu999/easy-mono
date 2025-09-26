import axios, {AxiosInstance} from 'axios';
import {z} from 'zod';

import {setApiAuthToken} from '@/store/services/apiSlice';

// auth schemas
export const SignupRequest_zod = z.object({
    email: z.string().email(),
    role: z.enum(['coach', 'client']),
});

export const VerifySignupRequest_zod = z.object({
    email: z.string().email(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    passcode: z.string(),
    password: z.string().min(6),
    token_id: z.string(),
});

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
export type SignupRequest = z.infer<typeof SignupRequest_zod>;

export interface TokenValidation {
    email: string;
    expires_at: string;
    token_id: string;
}

export type VerifyPhoneLoginOTPRequest = z.infer<typeof VerifyPhoneLoginOTPRequest_zod>;
export type VerifySignupRequest = z.infer<typeof VerifySignupRequest_zod>;

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
                    const {data: authToken} = await client.post<AccessToken>(
                        '/v1/auth/token',
                        {
                            grant_type: 'refresh_token',
                        },
                        {
                            withCredentials: true,
                        },
                    );
                    instance.defaults.authToken = authToken.access_token;
                    setApiAuthToken(authToken.access_token);
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
    setApiAuthToken(token);
};

export const authedClient = addAuthInterceptor(axios.create(client.defaults));
