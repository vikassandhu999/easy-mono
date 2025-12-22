import {baseAPISlice} from '../baseAPISlice';

export type CoachUser = {
    id: string;
    email: string;
    full_name: string;
    email_verified: boolean;
    email_verified_at: null | string;
    created_at: string;
    updated_at: string;
};

export type Coach = {
    id: string;
    user_id: string;
    business_id: string;
    status: string;
    bio: null | string;
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
    phone: null | string;
    notes: null | string;
    image_url: null | string;
    status: string;
    join_source: null | string;
    height_cm: null | number;
    weight_kg: null | number;
    date_of_birth: null | string; // ISO 8601 date
    sex: null | string;
    gender_identity: null | string;
    activity_level: null | string;
    goal: null | string;
    dietary_notes: null | string;
    injury_notes: null | string;
    medication_notes: null | string;
    measurement_system: null | string;
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
    phone: null | string;
    image_url: null | string;
    height_cm: null | number;
    weight_kg: null | number;
    date_of_birth: null | string; // "YYYY-MM-DD"
    sex: null | string;
    gender_identity: null | string;
    activity_level: null | string;
    goal: null | string;
    dietary_notes: null | string;
    injury_notes: null | string;
    medication_notes: null | string;
    measurement_system: null | string;
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
