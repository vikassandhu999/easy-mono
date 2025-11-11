import {useQuery, useMutation, useQueryClient, useInfiniteQuery} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {
    SchedulesAPI,
    Schedule,
    CreateScheduleProps,
    UpdateScheduleProps,
    ListSchedulesParams,
    AssignScheduleProps,
} from '@/Api/Schedules';

// Query keys
export const SCHEDULES_QUERY_KEYS = {
    all: ['schedules'] as const,
    lists: () => [...SCHEDULES_QUERY_KEYS.all, 'list'] as const,
    list: (params: ListSchedulesParams) => [...SCHEDULES_QUERY_KEYS.lists(), params] as const,
    details: () => [...SCHEDULES_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...SCHEDULES_QUERY_KEYS.details(), id] as const,
    program: (programId: string) => [...SCHEDULES_QUERY_KEYS.all, 'program', programId] as const,
};

// List schedules
export const useSchedules = (params?: ListSchedulesParams) => {
    return useInfiniteQuery({
        queryKey: SCHEDULES_QUERY_KEYS.list(params || {}),
        queryFn: async () => {
            const result = await SchedulesAPI.listSchedules(params);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        getNextPageParam: (lastPage) => {
            return lastPage.total === lastPage.page_size ? lastPage.page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get single schedule
export const useSchedule = (scheduleId: string, enabled = true) => {
    return useQuery({
        queryKey: SCHEDULES_QUERY_KEYS.detail(scheduleId),
        queryFn: () => SchedulesAPI.getSchedule(scheduleId),
        enabled: enabled && !!scheduleId,
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
        queryKey: SCHEDULES_QUERY_KEYS.program(programId),
        queryFn: () => SchedulesAPI.listProgramSchedules(programId, params),
        enabled: !!programId,
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
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules list
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    title: 'Schedule created',
                    message: 'Your schedule has been created successfully',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Failed to create schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to create schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Create program schedule mutation
export const useCreateProgramSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({programId, data}: {programId: string; data: CreateScheduleProps}) =>
            SchedulesAPI.createProgramSchedule(programId, data),
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
                    title: 'Program schedule created',
                    message: 'Your program schedule has been created successfully',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Failed to create program schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to create program schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Update schedule mutation
export const useUpdateSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({scheduleId, data}: {scheduleId: string; data: UpdateScheduleProps}) =>
            SchedulesAPI.updateSchedule(scheduleId, data),
        onSuccess: (result, variables) => {
            if (!result.isError) {
                // Update the specific schedule cache
                queryClient.setQueryData(SCHEDULES_QUERY_KEYS.detail(variables.scheduleId), result);

                // Invalidate lists to reflect changes
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    title: 'Schedule updated',
                    message: 'Your schedule has been updated successfully',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Failed to update schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to update schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Delete schedule mutation
export const useDeleteSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (scheduleId: string) => SchedulesAPI.deleteSchedule(scheduleId),
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
                    title: 'Schedule deleted',
                    message: 'The schedule has been deleted successfully',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Failed to delete schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to delete schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });
};

// Assign schedule mutation
export const useAssignSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({scheduleId, data}: {scheduleId: string; data: AssignScheduleProps}) =>
            SchedulesAPI.assignSchedule(scheduleId, data),
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules to show new client assignments
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });

                notifications.show({
                    title: 'Schedule assigned',
                    message: 'The schedule has been assigned to the client',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Failed to assign schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to assign schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
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
            queryKey: SCHEDULES_QUERY_KEYS.detail(scheduleId),
            queryFn: () => SchedulesAPI.getSchedule(scheduleId),
            staleTime: 30000, // Consider data fresh for 30 seconds
        });
    };

    return {prefetchSchedule};
};
