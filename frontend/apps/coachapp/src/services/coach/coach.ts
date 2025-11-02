import {baseAPISlice} from '../baseAPISlice';
import {
    type BusinessPreferences,
    type Coach,
    type CoachStats,
    CoachStats_zod,
    UpdateBusinessPreferences_zod,
    type UpdateBusinessPreferencesProps,
    UpdateCoach_zod,
    type UpdateCoachProps,
} from './coach_definition';

export const coachApi = baseAPISlice.injectEndpoints({
    endpoints: (build) => ({
        getCoach: build.query<Coach, void>({
            query: () => ({
                url: '/v1/coach/profile',
                method: 'GET',
            }),
            providesTags: [{type: 'Coach', id: 'PROFILE'}],
        }),

        getCoachStats: build.query<CoachStats, void>({
            query: () => ({
                url: '/v1/coach/stats',
                method: 'GET',
            }),
            transformResponse: (response) => CoachStats_zod.parse(response) as CoachStats,
            providesTags: [{type: 'Coach', id: 'STATS'}],
        }),

        updateCoach: build.mutation<Coach, UpdateCoachProps>({
            query: (data) => {
                const validatedData = UpdateCoach_zod.parse(data);
                return {
                    url: '/v1/coach/profile',
                    method: 'PATCH',
                    data: validatedData,
                };
            },
            invalidatesTags: [{type: 'Coach', id: 'PROFILE'}],
        }),

        updateBusinessPreferences: build.mutation<BusinessPreferences, UpdateBusinessPreferencesProps>({
            query: (data) => {
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

export const {useGetCoachQuery, useGetCoachStatsQuery, useUpdateCoachMutation, useUpdateBusinessPreferencesMutation} =
    coachApi;
