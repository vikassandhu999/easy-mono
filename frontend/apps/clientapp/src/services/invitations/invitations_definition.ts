import {z} from 'zod';

/* --------- Invitation Response (from GET /api/invitations/:token) */

/**
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

/* --------- Accept Invitation Request (send OTP to client email) */
export const AcceptInvitation_zod = z.object({
    email: z.string().email('Invalid email format'),
});

export interface AcceptInvitationRequest {
    email: string;
}

export interface AcceptInvitationResponse {
    message?: string;
    token: {
        token_id: string;
    };
}

export type AcceptInvitationRequestType = z.infer<typeof AcceptInvitation_zod>;

/* --------- Complete Client Signup (verify OTP + invitation token) */
export const CompleteInvitationSignup_zod = z.object({
    token_id: z.string(),
    code: z.string().length(6, 'Code must be 6 digits'),
    invitation_token: z.string(),
});

export interface CompleteInvitationSignupRequest {
    code: string;
    invitation_token: string;
    token_id: string;
}

export interface CompleteInvitationSignupResponse {
    session: {
        access_token: string;
        refresh_token: string;
    };
    user: {
        id: string;
        email?: string;
        phone_number?: string;
        client: {
            id: string;
            name: string;
            status: string;
            business_id: string;
        };
    };
}

export type CompleteInvitationSignupRequestType = z.infer<typeof CompleteInvitationSignup_zod>;

/* --------- Invitation Error Types */
export type InvitationErrorCode = 'already_accepted' | 'internal_error' | 'invalid_token' | 'token_expired';

export interface InvitationError {
    code: InvitationErrorCode;
    message: string;
}
