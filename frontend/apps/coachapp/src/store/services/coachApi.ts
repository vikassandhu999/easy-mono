import {
    type BusinessPreferences,
    type Coach,
    UpdateBusinessPreferences_zod,
    type UpdateBusinessPreferencesProps,
    UpdateCoach_zod,
    type UpdateCoachProps,
} from '@/api/coaches.ts';

import {apiSlice} from './baseAPISlice';

export const coachApi = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        // GET /v1/coach/profile
        getCoach: build.query<Coach, void>({
            query: () => ({
                url: '/v1/coach/profile',
                method: 'GET',
            }),
            providesTags: [{type: 'Coach', id: 'PROFILE'}],
        }),

        // PATCH /v1/coach/profile
        updateCoach: build.mutation<Coach, UpdateCoachProps>({
            query: (data) => {
                // Validate input using Zod schema
                const validatedData = UpdateCoach_zod.parse(data);
                return {
                    url: '/v1/coach/profile',
                    method: 'PATCH',
                    data: validatedData,
                };
            },
            invalidatesTags: [{type: 'Coach', id: 'PROFILE'}],
        }),

        // PUT /v1/coach/business/preferences
        updateBusinessPreferences: build.mutation<BusinessPreferences, UpdateBusinessPreferencesProps>({
            query: (data) => {
                // Validate input using Zod schema
                const validatedData = UpdateBusinessPreferences_zod.parse(data);
                return {
                    url: '/v1/coach/business/preferences',
                    method: 'PUT',
                    data: validatedData,
                };
            },
            invalidatesTags: [{type: 'Business', id: 'PREFERENCES'}],
        }),
    }),
    overrideExisting: false,
});

export const {useGetCoachQuery, useUpdateCoachMutation, useUpdateBusinessPreferencesMutation} = coachApi;
