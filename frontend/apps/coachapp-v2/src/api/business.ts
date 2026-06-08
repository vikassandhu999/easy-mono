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

export type BusinessUpdateRequest = {
  name?: string;
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
    getMyBusiness: build.query<ApiResponse<Business>, void>({
      query: () => '/v1/businesses/me',
    }),
    updateMyBusiness: build.mutation<ApiResponse<Business>, BusinessUpdateRequest>({
      query: (body) => ({
        url: '/v1/businesses/me',
        method: 'PATCH',
        body,
      }),
    }),
  }),
});

export const {
  useCreateBusinessMutation,
  useGetMyBusinessQuery,
  useLazyGetMyBusinessQuery,
  useUpdateMyBusinessMutation,
} = businessApi;
