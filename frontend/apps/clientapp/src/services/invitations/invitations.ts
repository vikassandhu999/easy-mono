import {baseAPISlice} from '../baseAPISlice';

/**
 * Invitation response from GET /api/invitations/:token
 * Matches the backend EasyWeb.InvitationJSON.show/1 response
 */
export interface InvitationResponse {
    business: {
        id: string;
        name: string;
    };
    client: {
        email: string;
        full_name: string;
    };
    invitation: {
        token: string;
        status: string;
        expires_at: string;
    };
    inviting_coach: null | {
        full_name: string;
    };
}

export const invitationsApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        /**
         * Get invitation details by token
         * GET /api/invitations/:token
         *
         * This is a public endpoint (no auth required)
         * Used to display invitation details before client accepts
         */
        getInvitation: build.query<InvitationResponse, string>({
            query: (token) => ({
                url: `/api/invitations/${token}`,
                method: 'get',
            }),
            providesTags: (_result, _error, token) => [{type: 'Invitation', id: token}],
        }),
    }),
    overrideExisting: false,
});

export const {useGetInvitationQuery, useLazyGetInvitationQuery} = invitationsApi;
