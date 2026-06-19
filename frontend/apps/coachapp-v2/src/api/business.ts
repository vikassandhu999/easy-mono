import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

export type Business = {
  id: string;
  name: string;
  handle: string;
  about: null | string;
  inserted_at: string;
  updated_at: string;
};

export type BusinessCreateRequest = {
  name: string;
  handle: string;
  about?: string;
};

export const businessApi = api.injectEndpoints({
  endpoints: (build) => ({
    createBusiness: build.mutation<ApiResponse<Business>, BusinessCreateRequest>({
      query: (body) => ({
        url: '/v1/businesses',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {useCreateBusinessMutation} = businessApi;
