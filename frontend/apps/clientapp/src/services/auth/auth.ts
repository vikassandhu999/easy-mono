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
        /**
         * Send login code to client's email
         * POST /api/auth/client/send-login-code
         */
        sendLoginCode: build.mutation<SendLoginCodeResponse, SendLoginCodeRequest>({
            query: (body) => ({
                url: '/api/auth/client/send-login-code',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Verify login code and get tokens
         * POST /api/auth/client/token
         */
        verifyLogin: build.mutation<VerifyLoginResponse, VerifyLoginRequest>({
            query: (body) => ({
                url: '/api/auth/client/token',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Refresh access token
         * POST /api/auth/client/token
         */
        refreshToken: build.mutation<RefreshTokenResponse, RefreshTokenRequest>({
            query: (body) => ({
                url: '/api/auth/client/token',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Complete client registration with invitation token
         * POST /api/auth/client/register
         */
        register: build.mutation<ClientSignupResponse, ClientSignupRequest>({
            query: (body) => ({
                url: '/api/auth/client/register',
                method: 'post',
                data: body,
            }),
        }),

        /**
         * Send verification code for invitation acceptance flow
         * This does NOT require an existing client record
         * POST /api/auth/client/send-invitation-code
         */
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
