import {baseAPISlice} from '../baseAPISlice';
import {
  type Business,
  type BusinessCreateRequest,
  type BusinessResponse,
  type BusinessUpdateRequest,
} from './business_definition';

export const businessApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * POST /v1/businesses
     * Create a new business. Used during onboarding.
     */
    createBusiness: build.mutation<Business, BusinessCreateRequest>({
      query: (body) => ({
        url: '/v1/businesses',
        method: 'post',
        data: body,
      }),
      transformResponse: (response: BusinessResponse) => response.data,
      invalidatesTags: ['Business'],
    }),

    /**
     * GET /v1/businesses/me
     * Returns the Business entity for the current user.
     */
    getMyBusiness: build.query<Business, void>({
      query: () => ({
        url: '/v1/businesses/me',
        method: 'get',
      }),
      transformResponse: (response: BusinessResponse) => response.data,
      providesTags: ['Business'],
    }),

    /**
     * PATCH /v1/businesses/me
     * Update current business. Accepts { name?, about? } per contract.
     */
    updateMyBusiness: build.mutation<Business, BusinessUpdateRequest>({
      query: (body) => ({
        url: '/v1/businesses/me',
        method: 'patch',
        data: body,
      }),
      transformResponse: (response: BusinessResponse) => response.data,
      invalidatesTags: ['Business'],
    }),
  }),
  overrideExisting: false,
});

export const {useCreateBusinessMutation, useGetMyBusinessQuery, useUpdateMyBusinessMutation} = businessApi;
