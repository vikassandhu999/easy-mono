import {z} from 'zod';

/* --------- Public Join Details (from GET /api/join/:code) */
export interface PublicJoinBusiness {
  handle: string;
  id: string;
  name: string;
}

export interface PublicJoinDetails {
  accent_color?: string;
  business: PublicJoinBusiness;
  cover_image_url?: string;
  public_join_approval_required: boolean;
  public_join_client_limit?: number;
  public_join_code: string;
  public_join_enabled: boolean;
  tagline?: string;
}

export interface GetPublicJoinResponse {
  data: PublicJoinDetails;
}

/* --------- Public Join Request (initiate signup with public code) */
export const PublicJoinRequest_zod = z.object({
  email: z.string().email('Invalid email format'),
  public_join_code: z.string().min(1, 'Join code is required'),
  name: z.string().min(1, 'Name is required').optional(),
});

export interface PublicJoinRequest {
  email: string;
  name?: string;
  public_join_code: string;
}

export interface PublicJoinResponse {
  message?: string;
  token: {
    token_id: string;
  };
}

export type PublicJoinRequestType = z.infer<typeof PublicJoinRequest_zod>;

/* --------- Public Join Error Types */
export type PublicJoinErrorCode =
  | 'already_member'
  | 'client_limit_reached'
  | 'internal_error'
  | 'invalid_code'
  | 'join_disabled';

export interface PublicJoinError {
  code: PublicJoinErrorCode;
  message: string;
}
