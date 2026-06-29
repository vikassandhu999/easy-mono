import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

// ── Types ───────────────────────────────────────────────────

export type ClientCoach = {
  first_name: null | string;
  last_name: null | string;
  phone: null | string;
  business_name: string;
};

export type ClientProfile = {
  id: string;
  first_name: null | string;
  last_name: null | string;
  email: null | string;
  phone: null | string;
  status: string;
  coach: ClientCoach;
};

export type UpdateClientProfileRequest = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

// ── Endpoints ───────────────────────────────────────────────

export const profileApi = api.injectEndpoints({
  // Hand-managed endpoints (cache tags, precise types) that share names with
  // the generated client — override makes these authoritative regardless of
  // import order.
  overrideExisting: true,
  endpoints: (build) => ({
    getClientProfile: build.query<ApiResponse<ClientProfile>, void>({
      query: () => '/v1/client/me',
      providesTags: [{type: 'ClientProfile', id: 'ME'}],
    }),
    updateClientProfile: build.mutation<ApiResponse<ClientProfile>, UpdateClientProfileRequest>({
      query: (body) => ({
        body,
        method: 'PATCH',
        url: '/v1/client/me',
      }),
      invalidatesTags: [{type: 'ClientProfile', id: 'ME'}],
    }),
  }),
});

export const {useGetClientProfileQuery, useUpdateClientProfileMutation} = profileApi;
