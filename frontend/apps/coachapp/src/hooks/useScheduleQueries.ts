import {notifications} from '@mantine/notifications';
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {
    AssignScheduleProps,
    CreateScheduleProps,
    ListSchedulesParams,
    Schedule,
    SchedulesAPI,
    UpdateScheduleProps,
} from '@/api/schedules.ts';

// Query keys
export const SCHEDULES_QUERY_KEYS = {
    all: ['schedules'] as const,
    detail: (id: string) => [...SCHEDULES_QUERY_KEYS.details(), id] as const,
    details: () => [...SCHEDULES_QUERY_KEYS.all, 'detail'] as const,
    list: (params: ListSchedulesParams) => [...SCHEDULES_QUERY_KEYS.lists(), params] as const,
    lists: () => [...SCHEDULES_QUERY_KEYS.all, 'list'] as const,
    program: (programId: string) => [...SCHEDULES_QUERY_KEYS.all, 'program', programId] as const,
};

// List schedules
export const useSchedules = (params?: ListSchedulesParams) => {
    return useInfiniteQuery({
        getNextPageParam: (lastPage) => {
            return lastPage.total === lastPage.page_size ? lastPage.page + 1 : undefined;
        },
        initialPageParam: 1,
        queryFn: async () => {
            const result = await SchedulesAPI.listSchedules(params);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        queryKey: SCHEDULES_QUERY_KEYS.list(params || {}),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get single schedule
export const useSchedule = (scheduleId: string, enabled = true) => {
    return useQuery({
        enabled: enabled && !!scheduleId,
        queryFn: () => SchedulesAPI.getSchedule(scheduleId),
        queryKey: SCHEDULES_QUERY_KEYS.detail(scheduleId),
        select: (result) => {
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
    });
};

// List program schedules
export const useProgramSchedules = (programId: string, params?: {page?: number; page_size?: number}) => {
    return useQuery({
        enabled: !!programId,
        queryFn: () => SchedulesAPI.listProgramSchedules(programId, params),
        queryKey: SCHEDULES_QUERY_KEYS.program(programId),
        select: (result) => {
            if (result.isError) {
                throw new Error(result.error?.message || 'Failed to fetch program schedules');
            }
            return result.getValue();
        },
    });
};

// Create schedule mutation
export const useCreateSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateScheduleProps) => SchedulesAPI.createSchedule(data),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to create schedule',
            });
        },
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules list
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    color: 'green',
                    message: 'Your schedule has been created successfully',
                    title: 'Schedule created',
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to create schedule',
                });
            }
        },
    });
};

// Create program schedule mutation
export const useCreateProgramSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({data, programId}: {data: CreateScheduleProps; programId: string}) =>
            SchedulesAPI.createProgramSchedule(programId, data),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to create program schedule',
            });
        },
        onSuccess: (result, variables) => {
            if (!result.isError) {
                // Invalidate both general schedules and program-specific schedules
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.program(variables.programId),
                });

                notifications.show({
                    color: 'green',
                    message: 'Your program schedule has been created successfully',
                    title: 'Program schedule created',
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to create program schedule',
                });
            }
        },
    });
};

// Update schedule mutation
export const useUpdateSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({data, scheduleId}: {data: UpdateScheduleProps; scheduleId: string}) =>
            SchedulesAPI.updateSchedule(scheduleId, data),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to update schedule',
            });
        },
        onSuccess: (result, variables) => {
            if (!result.isError) {
                // Update the specific schedule cache
                queryClient.setQueryData(SCHEDULES_QUERY_KEYS.detail(variables.scheduleId), result);

                // Invalidate lists to reflect changes
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    color: 'green',
                    message: 'Your schedule has been updated successfully',
                    title: 'Schedule updated',
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to update schedule',
                });
            }
        },
    });
};

// Delete schedule mutation
export const useDeleteSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (scheduleId: string) => SchedulesAPI.deleteSchedule(scheduleId),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to delete schedule',
            });
        },
        onSuccess: (result, scheduleId) => {
            if (!result.isError) {
                // Remove from cache
                queryClient.removeQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.detail(scheduleId),
                });

                // Invalidate lists
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    color: 'green',
                    message: 'The schedule has been deleted successfully',
                    title: 'Schedule deleted',
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to delete schedule',
                });
            }
        },
    });
};

// Assign schedule mutation
export const useAssignSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({data, scheduleId}: {data: AssignScheduleProps; scheduleId: string}) =>
            SchedulesAPI.assignSchedule(scheduleId, data),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to assign schedule',
            });
        },
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules to show new client assignments
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    color: 'green',
                    message: 'The schedule has been assigned to the client',
                    title: 'Schedule assigned',
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to assign schedule',
                });
            }
        },
    });
};

// Optimistic update helper for common operations
export const useOptimisticScheduleUpdate = () => {
    const queryClient = useQueryClient();

    const updateScheduleOptimistically = (scheduleId: string, updates: Partial<Schedule>) => {
        queryClient.setQueryData(SCHEDULES_QUERY_KEYS.detail(scheduleId), (oldData: any) => {
            if (oldData && !oldData.isError) {
                return {
                    ...oldData,
                    value: {
                        ...oldData.value,
                        ...updates,
                    },
                };
            }
            return oldData;
        });
    };

    return {updateScheduleOptimistically};
};

// Prefetch schedules for better UX
export const usePrefetchSchedule = () => {
    const queryClient = useQueryClient();

    const prefetchSchedule = (scheduleId: string) => {
        queryClient.prefetchQuery({
            queryFn: () => SchedulesAPI.getSchedule(scheduleId),
            queryKey: SCHEDULES_QUERY_KEYS.detail(scheduleId),
            staleTime: 30000, // Consider data fresh for 30 seconds
        });
    };

    return {prefetchSchedule};
};
