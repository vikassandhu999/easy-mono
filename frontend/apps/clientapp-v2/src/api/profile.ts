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

// ── Endpoints ───────────────────────────────────────────────

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClientProfile: build.query<ApiResponse<ClientProfile>, void>({
      query: () => '/v1/client/me',
      providesTags: [{type: 'ClientProfile', id: 'ME'}],
    }),
  }),
});

export const {useGetClientProfileQuery} = profileApi;
