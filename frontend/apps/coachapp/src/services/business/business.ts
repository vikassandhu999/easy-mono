import {baseAPISlice} from '../baseAPISlice';
import {
  Business,
  CreateBusinessOnboardingResponse,
  CreateBusinessRequest,
  UpdateBusinessProps,
} from './business_definition';

interface BusinessResponse {
  data: Business;
}

// RTK Query API for business onboarding
export const businessApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    createBusiness: build.mutation<CreateBusinessOnboardingResponse, CreateBusinessRequest>({
      query: (body) => ({
        url: '/api/onboarding/business',
        method: 'post',
        data: body,
      }),
    }),

    getBusiness: build.query<Business, void>({
      query: () => ({
        url: '/api/coach/organization',
        method: 'get',
      }),
      transformResponse: (response: BusinessResponse) => response.data,
      providesTags: ['Business'],
    }),

    updateBusiness: build.mutation<Business, UpdateBusinessProps>({
      query: (body) => ({
        url: '/api/coach/organization',
        method: 'patch',
        data: {business: body},
      }),
      transformResponse: (response: BusinessResponse) => response.data,
      invalidatesTags: ['Business'],
    }),
  }),
  overrideExisting: false,
});

export const {useCreateBusinessMutation, useGetBusinessQuery, useUpdateBusinessMutation} = businessApi;
