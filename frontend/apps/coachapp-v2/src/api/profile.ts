import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

// ── Types ───────────────────────────────────────────────────

export type CoachProfileBusiness = {
  id: string;
  name: string;
  slug: string;
};

export type CoachProfile = {
  id: string;
  first_name: null | string;
  last_name: null | string;
  email: string;
  phone: null | string;
  business: CoachProfileBusiness;
};

export type UpdateProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  business_name?: string;
};

// ── Endpoints ───────────────────────────────────────────────

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCoachProfile: build.query<ApiResponse<CoachProfile>, void>({
      query: () => '/v1/coach/me',
      providesTags: [{type: 'CoachProfile', id: 'ME'}],
    }),
    updateCoachProfile: build.mutation<ApiResponse<CoachProfile>, UpdateProfileRequest>({
      query: (body) => ({
        body,
        method: 'PATCH',
        url: '/v1/coach/me',
      }),
      invalidatesTags: [{type: 'CoachProfile', id: 'ME'}],
    }),
  }),
});

export const {useGetCoachProfileQuery, useUpdateCoachProfileMutation} = profileApi;
