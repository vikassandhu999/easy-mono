import {type AccessToken, type VerifyOTPResponse} from '@/services/auth';

import {baseAPISlice} from '../baseAPISlice';
import {
    type LoginProps,
    type PasswordResetConfirmProps,
    type PasswordResetProps,
    type RefreshTokenProps,
    type ResendVerifyProps,
    type SignUpProps,
    type TokenID,
    type VerifyProps,
} from './users_definition';

export const usersApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<AccessToken, LoginProps>({
            query: (body) => ({
                url: '/v1/auth/token',
                method: 'post',
                data: {
                    email: body.email,
                    grant_type: 'password',
                    password: body.password,
                },
                skipAuth: true,
            }),
        }),
        refreshToken: build.mutation<AccessToken, RefreshTokenProps>({
            query: (body) => ({
                url: '/v1/auth/token',
                method: 'post',
                data: {
                    grant_type: 'refresh_token',
                    refresh_token: body.refresh_token,
                },
                skipAuth: true,
            }),
        }),
        resendVerify: build.mutation<void, ResendVerifyProps>({
            query: (body) => ({
                url: '/v1/auth/verify-resend',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        resetPassword: build.mutation<TokenID, PasswordResetProps>({
            query: (body) => ({
                url: '/v1/auth/password-reset',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        resetPasswordConfirm: build.mutation<void, PasswordResetConfirmProps>({
            query: (body) => ({
                url: '/v1/auth/password-confirm',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        signUp: build.mutation<TokenID, SignUpProps>({
            query: (body) => ({
                url: '/v1/auth/signup',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        verifySignup: build.mutation<VerifyOTPResponse, VerifyProps>({
            query: (body) => ({
                url: '/v1/auth/verify',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useLoginMutation,
    useRefreshTokenMutation,
    useResendVerifyMutation,
    useResetPasswordMutation,
    useResetPasswordConfirmMutation,
    useSignUpMutation,
    useVerifySignupMutation,
} = usersApi;
