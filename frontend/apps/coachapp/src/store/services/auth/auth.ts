import {
    type AccessToken,
    type LoginProps,
    type PasswordConfirmRequest,
    type PasswordResetRequest,
    type RegisterWithPhoneRequest,
    type ResendVerifyRequest,
    type SendPasscodeRequest,
    type SendPhoneLoginOTPRequest,
    type SignInCodeRequest,
    type SignInRequest,
    type TokenValidation,
    type VerifyPhoneLoginOTPRequest,
} from '@/api/auth.ts';

import {apiSlice} from './apiSlice';

export const authApi = apiSlice.injectEndpoints({
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
        logout: build.mutation<{message: string}, void>({
            query: () => ({
                url: '/v1/auth/logout',
                method: 'post',
            }),
        }),
        passwordConfirm: build.mutation<AccessToken, PasswordConfirmRequest>({
            query: (body) => ({
                url: '/v1/auth/password-confirm',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        passwordReset: build.mutation<TokenValidation, PasswordResetRequest>({
            query: (body) => ({
                url: '/v1/auth/password-reset',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        refreshToken: build.mutation<AccessToken, void>({
            query: () => ({
                url: '/v1/auth/token',
                method: 'post',
                data: {
                    grant_type: 'refresh_token',
                },
                skipAuth: true,
            }),
        }),
        registerWithPhone: build.mutation<AccessToken, RegisterWithPhoneRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/register-with-phone',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        resendVerifyCode: build.mutation<TokenValidation, ResendVerifyRequest>({
            query: (body) => ({
                url: '/v1/auth/verify-resend',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        sendPasscode: build.mutation<TokenValidation, SendPasscodeRequest>({
            query: (body) => ({
                url: '/v1/auth/send-passcode',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        sendPhoneLoginOTP: build.mutation<TokenValidation, SendPhoneLoginOTPRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/send-phone-login-otp',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        signIn: build.mutation<TokenValidation, SignInRequest>({
            query: (body) => ({
                url: '/v1/auth/send-passcode',
                method: 'post',
                data: body,
                skipAuth: true,
            }),
        }),
        signInCode: build.mutation<AccessToken, SignInCodeRequest>({
            query: (body) => ({
                url: '/v1/auth/token',
                method: 'post',
                data: {
                    email: body.email,
                    grant_type: 'passcode',
                    passcode: body.passcode,
                    token_id: body.token_id,
                },
                skipAuth: true,
            }),
        }),
        verifyPhoneLoginOTP: build.mutation<AccessToken, VerifyPhoneLoginOTPRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/verify-phone-login-otp',
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
    useLogoutMutation,
    usePasswordConfirmMutation,
    usePasswordResetMutation,
    useRefreshTokenMutation,
    useRegisterWithPhoneMutation,
    useResendVerifyCodeMutation,
    useSendPasscodeMutation,
    useSendPhoneLoginOTPMutation,
    useSignInMutation,
    useSignInCodeMutation,
    useVerifyPhoneLoginOTPMutation,
} = authApi;
