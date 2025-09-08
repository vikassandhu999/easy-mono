import {notifications} from '@mantine/notifications';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {
    CreateScheduleEntryProps,
    ListScheduleEntriesParams,
    ScheduleEntriesAPI,
    ScheduleEntry,
    UpdateScheduleEntryProps,
} from '@/api/schedule_entries.ts';

// Query keys
export const SCHEDULE_ENTRIES_QUERY_KEYS = {
    all: ['schedule-entries'] as const,
    entry: (scheduleId: string, entryId: string) =>
        [...SCHEDULE_ENTRIES_QUERY_KEYS.schedule(scheduleId), entryId] as const,
    schedule: (scheduleId: string) => [...SCHEDULE_ENTRIES_QUERY_KEYS.all, scheduleId] as const,
    scheduleList: (scheduleId: string, params?: ListScheduleEntriesParams) =>
        [...SCHEDULE_ENTRIES_QUERY_KEYS.schedule(scheduleId), 'list', params] as const,
};

// List schedule entries
export const useScheduleEntries = (scheduleId: string, params?: ListScheduleEntriesParams) => {
    return useQuery({
        enabled: !!scheduleId,
        queryFn: async () => {
            const result = await ScheduleEntriesAPI.listEntries(scheduleId, params);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.scheduleList(scheduleId, params),
    });
};

// Get single schedule entry
export const useScheduleEntry = (scheduleId: string, entryId: string, enabled = true) => {
    return useQuery({
        enabled: enabled && !!scheduleId && !!entryId,
        queryFn: async () => {
            const result = await ScheduleEntriesAPI.getEntry(scheduleId, entryId);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.entry(scheduleId, entryId),
    });
};

// Create schedule entry mutation
export const useCreateScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({data, scheduleId}: {data: CreateScheduleEntryProps; scheduleId: string}) => {
            const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to add entry',
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                color: 'green',
                message: 'Schedule entry has been added successfully',
                title: 'Entry added',
            });
        },
    });
};

// Update schedule entry mutation
export const useUpdateScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            data,
            entryId,
            scheduleId,
        }: {
            data: UpdateScheduleEntryProps;
            entryId: string;
            scheduleId: string;
        }) => {
            const result = await ScheduleEntriesAPI.updateEntry(scheduleId, entryId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to update entry',
            });
        },
        onSuccess: (updatedEntry, variables) => {
            // Update the specific entry cache
            queryClient.setQueryData(
                SCHEDULE_ENTRIES_QUERY_KEYS.entry(variables.scheduleId, variables.entryId),
                updatedEntry,
            );

            // Invalidate the entries list
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                color: 'green',
                message: 'Schedule entry has been updated successfully',
                title: 'Entry updated',
            });
        },
    });
};

// Delete schedule entry mutation
export const useDeleteScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({entryId, scheduleId}: {entryId: string; scheduleId: string}) => {
            const result = await ScheduleEntriesAPI.deleteEntry(scheduleId, entryId);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to delete entry',
            });
        },
        onSuccess: (_, variables) => {
            // Remove from cache
            queryClient.removeQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.entry(variables.scheduleId, variables.entryId),
            });

            // Invalidate the entries list
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                color: 'green',
                message: 'Schedule entry has been deleted successfully',
                title: 'Entry deleted',
            });
        },
    });
};

// Bulk operations for multiple entries
export const useBulkUpdateScheduleEntries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            scheduleId,
            updates,
        }: {
            scheduleId: string;
            updates: Array<{data: UpdateScheduleEntryProps; entryId: string}>;
        }) => {
            const results = await Promise.all(
                updates.map(({data, entryId}) => ScheduleEntriesAPI.updateEntry(scheduleId, entryId, data)),
            );

            // Check if any failed
            const failedResults = results.filter((result) => result.isError);
            if (failedResults.length > 0) {
                throw new Error(`Failed to update ${failedResults.length} entries`);
            }

            return results.map((result) => result.value!);
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Some entries failed to update',
                title: 'Failed to update entries',
            });
        },
        onSuccess: (_, variables) => {
            // Invalidate the entire schedule entries cache
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                color: 'green',
                message: `${variables.updates.length} entries updated successfully`,
                title: 'Entries updated',
            });
        },
    });
};

// Bulk delete multiple entries
export const useBulkDeleteScheduleEntries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({entryIds, scheduleId}: {entryIds: string[]; scheduleId: string}) => {
            const results = await Promise.all(
                entryIds.map((entryId) => ScheduleEntriesAPI.deleteEntry(scheduleId, entryId)),
            );

            // Check if any failed
            const failedResults = results.filter((result) => result.isError);
            if (failedResults.length > 0) {
                throw new Error(`Failed to delete ${failedResults.length} entries`);
            }

            return results.map((result) => result.value!);
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Some entries failed to delete',
                title: 'Failed to delete entries',
            });
        },
        onSuccess: (_, variables) => {
            // Remove all deleted entries from cache
            variables.entryIds.forEach((entryId) => {
                queryClient.removeQueries({
                    queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.entry(variables.scheduleId, entryId),
                });
            });

            // Invalidate the schedule entries list
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                color: 'green',
                message: `${variables.entryIds.length} entries deleted successfully`,
                title: 'Entries deleted',
            });
        },
    });
};

// Optimistic update for drag and drop
export const useOptimisticScheduleEntryUpdate = () => {
    const queryClient = useQueryClient();

    const moveEntryOptimistically = (scheduleId: string, entryId: string, newWeek: number, newDay: number) => {
        queryClient.setQueryData(
            SCHEDULE_ENTRIES_QUERY_KEYS.entry(scheduleId, entryId),
            (oldData: ScheduleEntry | undefined) => {
                if (oldData) {
                    return {
                        ...oldData,
                        day_of_week: newDay,
                        week_number: newWeek,
                    };
                }
                return oldData;
            },
        );
    };

    const revertOptimisticUpdate = (scheduleId: string) => {
        queryClient.invalidateQueries({
            queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(scheduleId),
        });
    };

    return {moveEntryOptimistically, revertOptimisticUpdate};
};

// Prefetch entries for performance
export const usePrefetchScheduleEntries = () => {
    const queryClient = useQueryClient();

    const prefetchScheduleEntries = (scheduleId: string) => {
        queryClient.prefetchQuery({
            queryFn: async () => {
                const result = await ScheduleEntriesAPI.listEntries(scheduleId);
                if (result.isError) {
                    throw result.error;
                }
                return result.value!;
            },
            queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.scheduleList(scheduleId),
            staleTime: 30000, // Consider data fresh for 30 seconds
        });
    };

    return {prefetchScheduleEntries};
};
