import {baseAPISlice} from '../baseAPISlice';
import {type Coach, type CoachResponse, type CoachUpdateRequest} from './coach_definition';

export const coachApi = baseAPISlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /v1/coaches/me
     * Returns the Coach entity for the current user.
     */
    getMyCoach: build.query<Coach, void>({
      query: () => ({
        url: '/v1/coaches/me',
        method: 'get',
      }),
      transformResponse: (response: CoachResponse) => response.data,
      providesTags: ['Coach'],
    }),

    /**
     * PATCH /v1/coaches/me
     * Update current coach. Accepts { name?, title?, bio? } per contract.
     */
    updateMyCoach: build.mutation<Coach, CoachUpdateRequest>({
      query: (body) => ({
        url: '/v1/coaches/me',
        method: 'patch',
        data: body,
      }),
      transformResponse: (response: CoachResponse) => response.data,
      invalidatesTags: ['Coach'],
    }),
  }),
  overrideExisting: false,
});

export const {useGetMyCoachQuery, useUpdateMyCoachMutation} = coachApi;
