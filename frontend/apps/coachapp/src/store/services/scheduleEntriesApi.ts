import {
    type CreateScheduleEntryProps,
    type ListScheduleEntriesParams,
    type ListScheduleEntriesResult,
    type ScheduleEntry,
    type UpdateScheduleEntryProps,
} from '@/api/schedule_entries.ts';

import {apiSlice} from './apiSlice';

export const scheduleEntriesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // List schedule entries
        listScheduleEntries: builder.query<
            ListScheduleEntriesResult,
            {params?: ListScheduleEntriesParams; scheduleId: string}
        >({
            query: ({scheduleId, params}) => ({
                params,
                url: `/v1/coach/schedules/${scheduleId}/entries`,
            }),
            providesTags: (_result, _error, {scheduleId}) => [
                {type: 'ScheduleEntries', id: scheduleId},
                {type: 'ScheduleEntries', id: 'LIST'},
            ],
        }),

        // Get single schedule entry
        getScheduleEntry: builder.query<ScheduleEntry, {entryId: string; scheduleId: string}>({
            query: ({scheduleId, entryId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
            }),
            providesTags: (_result, _error, {entryId}) => [{type: 'ScheduleEntries', id: entryId}],
        }),

        // Create schedule entry
        createScheduleEntry: builder.mutation<ScheduleEntry, {data: CreateScheduleEntryProps; scheduleId: string}>({
            query: ({scheduleId, data}) => ({
                body: data,
                method: 'POST',
                url: `/v1/coach/schedules/${scheduleId}/entries`,
            }),
            invalidatesTags: (_result, _error, {scheduleId}) => [
                {type: 'ScheduleEntries', id: scheduleId},
                {type: 'ScheduleEntries', id: 'LIST'},
            ],
        }),

        // Update schedule entry
        updateScheduleEntry: builder.mutation<
            ScheduleEntry,
            {data: UpdateScheduleEntryProps; entryId: string; scheduleId: string}
        >({
            query: ({scheduleId, entryId, data}) => ({
                body: data,
                method: 'PATCH',
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
            }),
            invalidatesTags: (_result, _error, {scheduleId, entryId}) => [
                {type: 'ScheduleEntries', id: entryId},
                {type: 'ScheduleEntries', id: scheduleId},
                {type: 'ScheduleEntries', id: 'LIST'},
            ],
        }),

        // Delete schedule entry
        deleteScheduleEntry: builder.mutation<{message: string}, {entryId: string; scheduleId: string}>({
            query: ({scheduleId, entryId}) => ({
                method: 'DELETE',
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
            }),
            invalidatesTags: (_result, _error, {scheduleId, entryId}) => [
                {type: 'ScheduleEntries', id: entryId},
                {type: 'ScheduleEntries', id: scheduleId},
                {type: 'ScheduleEntries', id: 'LIST'},
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useListScheduleEntriesQuery,
    useGetScheduleEntryQuery,
    useCreateScheduleEntryMutation,
    useUpdateScheduleEntryMutation,
    useDeleteScheduleEntryMutation,
} = scheduleEntriesApi;
