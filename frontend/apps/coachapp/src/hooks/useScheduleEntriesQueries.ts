import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {
    ScheduleEntriesAPI,
    ScheduleEntry,
    CreateScheduleEntryProps,
    UpdateScheduleEntryProps,
    ListScheduleEntriesParams,
} from '@/api/schedule_entries.ts';

// Query keys
export const SCHEDULE_ENTRIES_QUERY_KEYS = {
    all: ['schedule-entries'] as const,
    schedule: (scheduleId: string) => [...SCHEDULE_ENTRIES_QUERY_KEYS.all, scheduleId] as const,
    scheduleList: (scheduleId: string, params?: ListScheduleEntriesParams) =>
        [...SCHEDULE_ENTRIES_QUERY_KEYS.schedule(scheduleId), 'list', params] as const,
    entry: (scheduleId: string, entryId: string) =>
        [...SCHEDULE_ENTRIES_QUERY_KEYS.schedule(scheduleId), entryId] as const,
};

// List schedule entries
export const useScheduleEntries = (scheduleId: string, params?: ListScheduleEntriesParams) => {
    return useQuery({
        queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.scheduleList(scheduleId, params),
        queryFn: async () => {
            const result = await ScheduleEntriesAPI.listEntries(scheduleId, params);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        enabled: !!scheduleId,
    });
};

// Get single schedule entry
export const useScheduleEntry = (scheduleId: string, entryId: string, enabled = true) => {
    return useQuery({
        queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.entry(scheduleId, entryId),
        queryFn: async () => {
            const result = await ScheduleEntriesAPI.getEntry(scheduleId, entryId);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        enabled: enabled && !!scheduleId && !!entryId,
    });
};

// Create schedule entry mutation
export const useCreateScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({scheduleId, data}: {scheduleId: string; data: CreateScheduleEntryProps}) => {
            const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                title: 'Entry added',
                message: 'Schedule entry has been added successfully',
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to add entry',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Update schedule entry mutation
export const useUpdateScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            scheduleId,
            entryId,
            data,
        }: {
            scheduleId: string;
            entryId: string;
            data: UpdateScheduleEntryProps;
        }) => {
            const result = await ScheduleEntriesAPI.updateEntry(scheduleId, entryId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
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
                title: 'Entry updated',
                message: 'Schedule entry has been updated successfully',
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to update entry',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Delete schedule entry mutation
export const useDeleteScheduleEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({scheduleId, entryId}: {scheduleId: string; entryId: string}) => {
            const result = await ScheduleEntriesAPI.deleteEntry(scheduleId, entryId);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
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
                title: 'Entry deleted',
                message: 'Schedule entry has been deleted successfully',
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to delete entry',
                message: error.message || 'Something went wrong',
                color: 'red',
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
            updates: Array<{entryId: string; data: UpdateScheduleEntryProps}>;
        }) => {
            const results = await Promise.all(
                updates.map(({entryId, data}) => ScheduleEntriesAPI.updateEntry(scheduleId, entryId, data)),
            );

            // Check if any failed
            const failedResults = results.filter((result) => result.isError);
            if (failedResults.length > 0) {
                throw new Error(`Failed to update ${failedResults.length} entries`);
            }

            return results.map((result) => result.value!);
        },
        onSuccess: (_, variables) => {
            // Invalidate the entire schedule entries cache
            queryClient.invalidateQueries({
                queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
            });

            notifications.show({
                title: 'Entries updated',
                message: `${variables.updates.length} entries updated successfully`,
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to update entries',
                message: error.message || 'Some entries failed to update',
                color: 'red',
            });
        },
    });
};

// Bulk delete multiple entries
export const useBulkDeleteScheduleEntries = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({scheduleId, entryIds}: {scheduleId: string; entryIds: string[]}) => {
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
                title: 'Entries deleted',
                message: `${variables.entryIds.length} entries deleted successfully`,
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to delete entries',
                message: error.message || 'Some entries failed to delete',
                color: 'red',
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
                        week_number: newWeek,
                        day_of_week: newDay,
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
            queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.scheduleList(scheduleId),
            queryFn: async () => {
                const result = await ScheduleEntriesAPI.listEntries(scheduleId);
                if (result.isError) {
                    throw result.error;
                }
                return result.value!;
            },
            staleTime: 30000, // Consider data fresh for 30 seconds
        });
    };

    return {prefetchScheduleEntries};
};
