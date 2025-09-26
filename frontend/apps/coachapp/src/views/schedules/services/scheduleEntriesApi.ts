import type {
    CreateScheduleEntryProps,
    ListScheduleEntriesParams,
    ListScheduleEntriesResult,
    ScheduleEntry,
    UpdateScheduleEntryProps,
} from '../../../api/schedule_entries';

import {apiSlice} from '../../../store/services/apiSlice';

export const scheduleEntriesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // List entries for a schedule with infinite query support
        listScheduleEntries: builder.query<
            ListScheduleEntriesResult,
            {params?: ListScheduleEntriesParams; scheduleId: string}
        >({
            query: ({params, scheduleId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries`,
                params,
            }),
            providesTags: (result, _error, {scheduleId}) => [
                {type: 'ScheduleEntries', id: `LIST_${scheduleId}`},
                ...(result?.records?.map((entry) => ({
                    type: 'ScheduleEntries' as const,
                    id: entry.id,
                })) || []),
            ],
        }),

        // Get single schedule entry
        getScheduleEntry: builder.query<ScheduleEntry, {entryId: string; scheduleId: string}>({
            query: ({entryId, scheduleId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
            }),
            providesTags: (_result, _error, {entryId}) => [{type: 'ScheduleEntries', id: entryId}],
        }),

        // Create schedule entry
        createScheduleEntry: builder.mutation<ScheduleEntry, {data: CreateScheduleEntryProps; scheduleId: string}>({
            query: ({data, scheduleId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, {scheduleId}) => [
                {type: 'ScheduleEntries', id: `LIST_${scheduleId}`},
                {type: 'Schedules', id: scheduleId},
            ],
        }),

        // Update schedule entry
        updateScheduleEntry: builder.mutation<
            ScheduleEntry,
            {data: UpdateScheduleEntryProps; entryId: string; scheduleId: string}
        >({
            query: ({data, entryId, scheduleId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, {entryId, scheduleId}) => [
                {type: 'ScheduleEntries', id: entryId},
                {type: 'ScheduleEntries', id: `LIST_${scheduleId}`},
                {type: 'Schedules', id: scheduleId},
            ],
        }),

        // Delete schedule entry
        deleteScheduleEntry: builder.mutation<{message: string}, {entryId: string; scheduleId: string}>({
            query: ({entryId, scheduleId}) => ({
                url: `/v1/coach/schedules/${scheduleId}/entries/${entryId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, {entryId, scheduleId}) => [
                {type: 'ScheduleEntries', id: entryId},
                {type: 'ScheduleEntries', id: `LIST_${scheduleId}`},
                {type: 'Schedules', id: scheduleId},
            ],
        }),
    }),
});

export const {
    useCreateScheduleEntryMutation,
    useDeleteScheduleEntryMutation,
    useGetScheduleEntryQuery,
    useListScheduleEntriesQuery,
    useUpdateScheduleEntryMutation,
} = scheduleEntriesApi;
