import {
    type AccessToken,
    type RefreshResponse,
    type RegisterRequest,
    type RegisterResponse,
    type RegisterWithPhoneRequest,
    type ResendVerifyRequest,
    type SendOTPRequest,
    type SendOTPResponse,
    type SendPasscodeRequest,
    type SendPhoneLoginOTPRequest,
    type SignInCodeRequest,
    type SignInRequest,
    type TokenValidation,
    type VerifyOTPRequest,
    type VerifyOTPResponse,
    type VerifyPhoneLoginOTPRequest,
} from '@/services/auth';

import {baseAPISlice} from '../baseAPISlice';

export const authApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        logout: build.mutation<{status: string}, void>({
            query: () => ({
                url: '/api/auth/logout',
                method: 'post',
            }),
        }),
        refreshToken: build.mutation<RefreshResponse, void>({
            query: () => ({
                url: '/api/auth/refresh',
                method: 'post',
                data: {},
            }),
        }),
        register: build.mutation<RegisterResponse, RegisterRequest>({
            query: (body) => ({
                url: '/api/auth/register',
                method: 'post',
                data: body,
            }),
        }),
        registerWithPhone: build.mutation<AccessToken, RegisterWithPhoneRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/register-with-phone',
                method: 'post',
                data: body,
            }),
        }),
        resendVerifyCode: build.mutation<TokenValidation, ResendVerifyRequest>({
            query: (body) => ({
                url: '/v1/auth/verify-resend',
                method: 'post',
                data: body,
            }),
        }),
        sendOTP: build.mutation<SendOTPResponse, SendOTPRequest>({
            query: (body) => ({
                url: '/api/auth/send-otp',
                method: 'post',
                data: body,
            }),
        }),
        sendPasscode: build.mutation<TokenValidation, SendPasscodeRequest>({
            query: (body) => ({
                url: '/v1/auth/send-passcode',
                method: 'post',
                data: body,
            }),
        }),
        sendPhoneLoginOTP: build.mutation<TokenValidation, SendPhoneLoginOTPRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/send-phone-login-otp',
                method: 'post',
                data: body,
            }),
        }),
        signIn: build.mutation<TokenValidation, SignInRequest>({
            query: (body) => ({
                url: '/v1/auth/send-passcode',
                method: 'post',
                data: body,
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
            }),
        }),
        verifyOTP: build.mutation<VerifyOTPResponse, VerifyOTPRequest>({
            query: (body) => ({
                url: '/api/auth/verify-otp',
                method: 'post',
                data: body,
            }),
        }),
        verifyPhoneLoginOTP: build.mutation<AccessToken, VerifyPhoneLoginOTPRequest>({
            query: (body) => ({
                url: '/v1/coach/auth/verify-phone-login-otp',
                method: 'post',
                data: body,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useLogoutMutation,
    useRefreshTokenMutation,
    useRegisterMutation,
    useRegisterWithPhoneMutation,
    useResendVerifyCodeMutation,
    useSendOTPMutation,
    useSendPasscodeMutation,
    useSendPhoneLoginOTPMutation,
    useSignInMutation,
    useSignInCodeMutation,
    useVerifyOTPMutation,
    useVerifyPhoneLoginOTPMutation,
} = authApi;
