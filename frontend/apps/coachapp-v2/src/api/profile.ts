import {api} from '@/api/base';
import {coachApi} from '@/api/generated';
import {ApiResponse} from '@/api/shared';

export type CoachProfileBusiness = {
  id: string;
  name: string;
  slug: string;
  whatsapp_number: null | string;
  dashboard_setup_hidden_at: null | string;
  dashboard_setup_hidden_reason: 'completed' | 'dismissed' | null;
};

export type CoachProfile = {
  id: string;
  first_name: null | string;
  last_name: null | string;
  email: string;
  phone: null | string;
  is_owner: boolean;
  business: CoachProfileBusiness;
};

export type UpdateProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  business_name?: string;
  whatsapp_number?: string;
};

const profileApi = api.injectEndpoints({
  // Hand-managed endpoints (cache tags, precise types) that share names with
  // the generated client — override makes these authoritative regardless of
  // import order.
  overrideExisting: true,
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

coachApi.enhanceEndpoints({
  endpoints: {
    updateDashboardSetup: {invalidatesTags: [{type: 'CoachProfile', id: 'ME'}]},
  },
});

export const {useUpdateDashboardSetupMutation} = coachApi;
