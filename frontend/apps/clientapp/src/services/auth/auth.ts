import {baseAPISlice} from '../baseAPISlice';
import {
    ClientSignupRequest,
    ClientSignupResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    SendInvitationCodeRequest,
    SendInvitationCodeResponse,
    SendLoginCodeRequest,
    SendLoginCodeResponse,
    SendPublicJoinCodeRequest,
    SendPublicJoinCodeResponse,
    VerifyLoginRequest,
    VerifyLoginResponse,
} from './auth_definition';

export const authApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        sendLoginCode: build.mutation<SendLoginCodeResponse, SendLoginCodeRequest>({
            query: (body) => ({
                url: '/api/auth/client/login/code',
                method: 'post',
                data: body,
            }),
        }),

        verifyLogin: build.mutation<VerifyLoginResponse, VerifyLoginRequest>({
            query: (body) => ({
                url: '/api/auth/client/login',
                method: 'post',
                data: body,
            }),
        }),

        refreshToken: build.mutation<RefreshTokenResponse, RefreshTokenRequest>({
            query: (body) => ({
                url: '/api/auth/client/refresh',
                method: 'post',
                data: body,
            }),
        }),

        register: build.mutation<ClientSignupResponse, ClientSignupRequest>({
            query: (body) => ({
                url: '/api/auth/client/register',
                method: 'post',
                data: body,
            }),
        }),

        sendInvitationCode: build.mutation<SendInvitationCodeResponse, SendInvitationCodeRequest>({
            query: (body) => ({
                url: '/api/auth/client/send-invitation-code',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Send verification code for public join flow
         * This does NOT require an existing client record
         * POST /api/auth/client/send-public-join-code
         */
        sendPublicJoinCode: build.mutation<SendPublicJoinCodeResponse, SendPublicJoinCodeRequest>({
            query: (body) => ({
                url: '/api/auth/client/send-public-join-code',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Logout client
         * POST /api/auth/logout
         */
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
    useSendLoginCodeMutation,
    useVerifyLoginMutation,
    useRefreshTokenMutation,
    useRegisterMutation,
    useSendInvitationCodeMutation,
    useSendPublicJoinCodeMutation,
    useLogoutMutation,
} = authApi;
