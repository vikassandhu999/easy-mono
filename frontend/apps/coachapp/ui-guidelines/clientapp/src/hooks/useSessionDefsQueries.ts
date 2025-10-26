import {useQuery, useMutation, useQueryClient, useInfiniteQuery} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {
    SessionDefsAPI,
    CreateSessionDef,
    UpdateSessionDef,
    ListSessionDefs,
    UpdateSessionDefItemsInput,
} from '@/Api/SessionDefs';

// Query keys
export const SESSION_DEFS_QUERY_KEYS = {
    all: ['sessiondefs'] as const,
    lists: () => [...SESSION_DEFS_QUERY_KEYS.all, 'list'] as const,
    list: (params: ListSessionDefs) => [...SESSION_DEFS_QUERY_KEYS.lists(), params] as const,
    details: () => [...SESSION_DEFS_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...SESSION_DEFS_QUERY_KEYS.details(), id] as const,
    items: () => [...SESSION_DEFS_QUERY_KEYS.all, 'items'] as const,
    itemsBySessionDef: (sessionDefId: string) => [...SESSION_DEFS_QUERY_KEYS.items(), sessionDefId] as const,
};

// List session definitions
export const useSessionDefs = (params?: ListSessionDefs) => {
    return useInfiniteQuery({
        queryKey: SESSION_DEFS_QUERY_KEYS.list(params || {}),
        queryFn: async ({pageParam = 1}) => {
            const result = await SessionDefsAPI.listSessionDefs({...params, page: pageParam});
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        getNextPageParam: (lastPage) => {
            return lastPage.records.length === lastPage.page_size ? lastPage.page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get a single session definition
export const useSessionDef = (id: string, options?: {include_contents?: boolean; include_template?: boolean}) => {
    return useQuery({
        queryKey: SESSION_DEFS_QUERY_KEYS.detail(id),
        queryFn: async () => {
            const result = await SessionDefsAPI.getSessionDef(id, options);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        enabled: !!id,
    });
};

// Create session definition
export const useCreateSessionDef = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateSessionDef) => {
            const result = await SessionDefsAPI.createSessionDef(data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            notifications.show({
                title: 'Success',
                message: 'Session definition created successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error?.message || 'Failed to create session definition',
                color: 'red',
            });
        },
    });
};

// Update session definition
export const useUpdateSessionDef = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({id, data}: {id: string; data: UpdateSessionDef}) => {
            const result = await SessionDefsAPI.updateSessionDef(id, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: (_, {id}) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.detail(id)});
            notifications.show({
                title: 'Success',
                message: 'Session definition updated successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error?.message || 'Failed to update session definition',
                color: 'red',
            });
        },
    });
};

// Delete session definition
export const useDeleteSessionDef = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const result = await SessionDefsAPI.deleteSessionDef(id);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            notifications.show({
                title: 'Success',
                message: 'Session definition deleted successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error?.message || 'Failed to delete session definition',
                color: 'red',
            });
        },
    });
};

// Get session definition items
export const useSessionDefItems = (sessionDefId: string, options?: {include_contents?: boolean}) => {
    return useQuery({
        queryKey: SESSION_DEFS_QUERY_KEYS.itemsBySessionDef(sessionDefId),
        queryFn: async () => {
            const result = await SessionDefsAPI.getSessionDefItems(sessionDefId, options);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        enabled: !!sessionDefId,
    });
};

// Update session definition items (replaces all old item operations)
export const useUpdateSessionDefItems = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({sessionDefId, data}: {sessionDefId: string; data: UpdateSessionDefItemsInput}) => {
            const result = await SessionDefsAPI.updateSessionDefItems(sessionDefId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onSuccess: (_, {sessionDefId}) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.detail(sessionDefId)});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.itemsBySessionDef(sessionDefId)});
            notifications.show({
                title: 'Success',
                message: 'Session items updated successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error?.message || 'Failed to update session items',
                color: 'red',
            });
        },
    });
};
