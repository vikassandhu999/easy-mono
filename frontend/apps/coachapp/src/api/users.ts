import {z} from 'zod';

import {Result} from '@/utils/error.ts';

import {type AccessToken, authedClient} from './auth';

export const SignUp_zod = z.object({
    email: z.string().email(),
});

export const Login_zod = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const Verify_zod = z.object({
    passcode: z.string().min(4).max(6),
    token_id: z.string().uuid(),
});

export const ResendVerify_zod = z.object({
    token_id: z.string().uuid(),
});

export const PasswordReset_zod = z.object({
    email: z.string().email(),
});

export const PasswordResetConfirm_zod = z.object({
    passcode: z.string().min(4).max(6),
    password: z.string().min(6),
    token_id: z.string().uuid(),
});

export type LoginProps = z.infer<typeof Login_zod>;
export type PasswordResetConfirmProps = z.infer<typeof PasswordResetConfirm_zod>;
export type PasswordResetProps = z.infer<typeof PasswordReset_zod>;
export type RefreshTokenProps = {
    refresh_token: string;
};
export type ResendVerifyProps = z.infer<typeof ResendVerify_zod>;
export type SignUpProps = z.infer<typeof SignUp_zod>;
export interface TokenID {
    token_id: string;
}

export interface User {
    email: string;
    id: string;
}

export type VerifyProps = z.infer<typeof Verify_zod>;

export const UsersAPI = {
    login: async (data: LoginProps): Promise<Result<AccessToken>> => {
        try {
            const response = await authedClient.post(
                '/v1/auth/token',
                {
                    email: data.email,
                    grant_type: 'password',
                    password: data.password,
                },
                {skipAuth: true},
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    refreshToken: async (data: RefreshTokenProps): Promise<Result<AccessToken>> => {
        try {
            const response = await authedClient.post(
                '/v1/auth/token',
                {
                    grant_type: 'refresh_token',
                    refresh_token: data.refresh_token,
                },
                {skipAuth: true},
            );
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    resendVerify: async (data: ResendVerifyProps): Promise<Result<void>> => {
        try {
            const response = await authedClient.post('/v1/auth/verify-resend', data, {
                skipAuth: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    resetPassword: async (data: PasswordResetProps): Promise<Result<TokenID>> => {
        try {
            const response = await authedClient.post('/v1/auth/password-reset', data, {
                skipAuth: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    resetPasswordConfirm: async (data: PasswordResetConfirmProps): Promise<Result<void>> => {
        try {
            const response = await authedClient.post('/v1/auth/password-confirm', data, {
                skipAuth: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    signUp: async (data: SignUpProps): Promise<Result<TokenID>> => {
        try {
            const response = await authedClient.post('/v1/auth/signup', data, {
                skipAuth: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
    verify: async (data: VerifyProps): Promise<Result<AccessToken>> => {
        try {
            const response = await authedClient.post('/v1/auth/verify', data, {
                skipAuth: true,
            });
            return Result.success(response.data);
        } catch (error: unknown) {
            return Result.failure(error);
        }
    },
};
