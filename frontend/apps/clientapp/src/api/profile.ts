import { Result } from "@/utils/error";
import { authedClient } from "./auth";

// Profile response interface matching the backend response format
export interface ClientProfile {
  id: string;
  business_id: string;
  created_by: string;
  invitation_token: string;
  invitation_email: string;
  invitation_phone: string;
  user_id: string | null;
  name: string;
  notes: string;
  assigned_coach_id: string | null;
  membership_status: string;
  membership_start_date: string;
  membership_end_date: string | null;
  created_at: string;
  updated_at: string;
  assigned_coach?: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// Union type for profile which can be either ClientProfile or UserProfile
export type Profile = ClientProfile | UserProfile;

export const ProfileAPI = {
  // GET /v1/client/profile
  getMyProfile: async (): Promise<Result<Profile>> => {
    try {
      const response = await authedClient.get("/v1/client/profile");
      return Result.success(response.data);
    } catch (error: unknown) {
      return Result.failure(error);
    }
  },
};
