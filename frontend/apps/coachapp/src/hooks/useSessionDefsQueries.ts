import {notifications} from '@mantine/notifications';
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {
    CreateSessionDef,
    ListSessionDefs,
    SessionDefsAPI,
    UpdateSessionDef,
    UpdateSessionDefItemsInput,
} from '@/api/session_defs.ts';

// Query keys
export const SESSION_DEFS_QUERY_KEYS = {
    all: ['sessiondefs'] as const,
    detail: (id: string) => [...SESSION_DEFS_QUERY_KEYS.details(), id] as const,
    details: () => [...SESSION_DEFS_QUERY_KEYS.all, 'detail'] as const,
    items: () => [...SESSION_DEFS_QUERY_KEYS.all, 'items'] as const,
    itemsBySessionDef: (sessionDefId: string) => [...SESSION_DEFS_QUERY_KEYS.items(), sessionDefId] as const,
    list: (params: ListSessionDefs) => [...SESSION_DEFS_QUERY_KEYS.lists(), params] as const,
    lists: () => [...SESSION_DEFS_QUERY_KEYS.all, 'list'] as const,
};

// List session definitions
export const useSessionDefs = (params?: ListSessionDefs) => {
    return useInfiniteQuery({
        getNextPageParam: (lastPage) => {
            return lastPage.records.length === lastPage.page_size ? lastPage.page + 1 : undefined;
        },
        initialPageParam: 1,
        queryFn: async ({pageParam = 1}) => {
            const result = await SessionDefsAPI.listSessionDefs({...params, page: pageParam});
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: SESSION_DEFS_QUERY_KEYS.list(params || {}),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get a single session definition
export const useSessionDef = (id: string, options?: {include_contents?: boolean; include_template?: boolean}) => {
    return useQuery({
        enabled: !!id,
        queryFn: async () => {
            const result = await SessionDefsAPI.getSessionDef(id, options);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: SESSION_DEFS_QUERY_KEYS.detail(id),
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
        onError: (error: any) => {
            notifications.show({
                color: 'red',
                message: error?.message || 'Failed to create session definition',
                title: 'Error',
            });
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            notifications.show({
                color: 'green',
                message: 'Session definition created successfully',
                title: 'Success',
            });
        },
    });
};

// Update session definition
export const useUpdateSessionDef = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({data, id}: {data: UpdateSessionDef; id: string}) => {
            const result = await SessionDefsAPI.updateSessionDef(id, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error: any) => {
            notifications.show({
                color: 'red',
                message: error?.message || 'Failed to update session definition',
                title: 'Error',
            });
        },
        onSuccess: (_, {id}) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.detail(id)});
            notifications.show({
                color: 'green',
                message: 'Session definition updated successfully',
                title: 'Success',
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
        onError: (error: any) => {
            notifications.show({
                color: 'red',
                message: error?.message || 'Failed to delete session definition',
                title: 'Error',
            });
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            notifications.show({
                color: 'green',
                message: 'Session definition deleted successfully',
                title: 'Success',
            });
        },
    });
};

// Get session definition items
export const useSessionDefItems = (sessionDefId: string, options?: {include_contents?: boolean}) => {
    return useQuery({
        enabled: !!sessionDefId,
        queryFn: async () => {
            const result = await SessionDefsAPI.getSessionDefItems(sessionDefId, options);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: SESSION_DEFS_QUERY_KEYS.itemsBySessionDef(sessionDefId),
    });
};

// Update session definition items (replaces all old item operations)
export const useUpdateSessionDefItems = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({data, sessionDefId}: {data: UpdateSessionDefItemsInput; sessionDefId: string}) => {
            const result = await SessionDefsAPI.updateSessionDefItems(sessionDefId, data);
            if (result.isError) {
                throw result.error;
            }
            return result.value!;
        },
        onError: (error: any) => {
            notifications.show({
                color: 'red',
                message: error?.message || 'Failed to update session items',
                title: 'Error',
            });
        },
        onSuccess: (_, {sessionDefId}) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.detail(sessionDefId)});
            queryClient.invalidateQueries({queryKey: SESSION_DEFS_QUERY_KEYS.itemsBySessionDef(sessionDefId)});
            notifications.show({
                color: 'green',
                message: 'Session items updated successfully',
                title: 'Success',
            });
        },
    });
};
