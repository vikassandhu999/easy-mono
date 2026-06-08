import {api} from '@/api/base';
import {ApiResponse} from '@/api/shared';

export type Coach = {
  id: string;
  name: null | string;
  title: null | string;
  bio: null | string;
  inserted_at: string;
  updated_at: string;
};

export type CoachUpdateRequest = {
  name?: string;
  title?: string;
  bio?: string;
};

export const coachApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyCoach: build.query<ApiResponse<Coach>, void>({
      query: () => '/v1/coaches/me',
    }),
    updateMyCoach: build.mutation<ApiResponse<Coach>, CoachUpdateRequest>({
      query: (body) => ({
        url: '/v1/coaches/me',
        method: 'PATCH',
        body,
      }),
    }),
  }),
});

export const {useGetMyCoachQuery, useUpdateMyCoachMutation} = coachApi;
