import {baseAPISlice} from '../baseAPISlice';


export type CoachUser = {
    id: string;
    email: string;
    full_name: string;
    email_verified: boolean;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
};

export type Coach = {
    id: string;
    user_id: string;
    business_id: string;
    status: string;
    bio: string | null;
    specialties: string[];
    credentials: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    user?: CoachUser;
};

export type Business = {
    id: string;
    name: string;
    handle: string;
};

export type Profile = {
    id: string;
    email: string;
    full_name?: string; // backend currently comments this out in JSON view; keep optional until enabled
    phone: string | null;
    notes: string | null;
    image_url: string | null;
    status: string;
    join_source: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    date_of_birth: string | null; // ISO 8601 date
    sex: string | null;
    gender_identity: string | null;
    activity_level: string | null;
    goal: string | null;
    dietary_notes: string | null;
    injury_notes: string | null;
    medication_notes: string | null;
    measurement_system: string | null;
    coaches: Coach[];
    business: Business | null;
    created_at: string;
    updated_at: string;
};

export type GetProfileResponse = {
    data: Profile;
};

export type UpdateProfileRequest = Partial<{
    full_name: string;
    phone: string | null;
    image_url: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    date_of_birth: string | null; // "YYYY-MM-DD"
    sex: string | null;
    gender_identity: string | null;
    activity_level: string | null;
    goal: string | null;
    dietary_notes: string | null;
    injury_notes: string | null;
    medication_notes: string | null;
    measurement_system: string | null;
}>;

export type UpdateProfileResponse = GetProfileResponse;

export const profileApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({

        getProfile: build.query<GetProfileResponse, void>({
            query: () => ({
                url: '/api/client/profile',
                method: 'get',
            }),
            providesTags: (_result) => [{type: 'Profile', id: 'ME'}],
        }),


        updateProfile: build.mutation<UpdateProfileResponse, UpdateProfileRequest>({
            query: (body) => ({
                url: '/api/client/profile',
                method: 'patch',
                data: body,
            }),
            invalidatesTags: (_result) => [{type: 'Profile', id: 'ME'}],
        }),
    }),
    overrideExisting: false,
});

export const {useGetProfileQuery, useLazyGetProfileQuery, useUpdateProfileMutation} = profileApi;
