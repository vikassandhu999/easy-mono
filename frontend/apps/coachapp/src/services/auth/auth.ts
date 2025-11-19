import {
    RefreshTokenRequest,
    RefreshTokenResponse,
    type RegisterRequest,
    type RegisterResponse,
    SendLoginCodeRequest,
    SendLoginCodeResponse,
    UserProfileResponse,
    VerifyLoginRequest,
    VerifyLoginResponse,
    VerifyRegisterationRequest,
    VerifyRegisterationResponse,
} from '@/services/auth';

import {baseAPISlice} from '../baseAPISlice';

export const authApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        sendLoginCode: build.mutation<SendLoginCodeResponse, SendLoginCodeRequest>({
            query: (body) => ({
                url: '/api/auth/send-login-code',
                method: 'post',
                data: body,
            }),
        }),
        verifyLogin: build.mutation<VerifyLoginResponse, VerifyLoginRequest>({
            query: (body) => ({
                url: '/api/auth/token',
                method: 'post',
                data: body,
            }),
        }),
        refreshToken: build.mutation<RefreshTokenResponse, RefreshTokenRequest>({
            query: (body) => ({
                url: '/api/auth/token',
                method: 'post',
                data: body,
            }),
        }),
        register: build.mutation<RegisterResponse, RegisterRequest>({
            query: (body) => ({
                url: '/api/auth/register',
                method: 'post',
                data: body,
            }),
        }),
        verifyRegiration: build.mutation<VerifyRegisterationResponse, VerifyRegisterationRequest>({
            query: (body) => ({
                url: '/api/auth/verify',
                method: 'post',
                data: body,
            }),
        }),
        profile: build.query<UserProfileResponse, void>({
            query: () => ({
                url: '/api/auth/me',
                method: 'get',
            }),
        }),
        logout: build.mutation<{status: string}, void>({
            query: () => ({
                url: '/api/auth/logout',
                method: 'post',
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useLogoutMutation,
    useRefreshTokenMutation,
    useRegisterMutation,
    useVerifyRegirationMutation,
    useSendLoginCodeMutation,
    useVerifyLoginMutation,
    useProfileQuery,
} = authApi;
