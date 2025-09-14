import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo} from 'react';

import {
    ClientsAPI,
    type CreateClientProps,
    type ListClientsProps,
    MembershipStatusType,
    type UpdateClientProps,
} from '@/api/clients.ts';

// Query Keys
export const CLIENT_QUERY_KEYS = {
    all: ['clients'] as const,
    detail: (id: string) => [...CLIENT_QUERY_KEYS.details(), id] as const,
    details: () => [...CLIENT_QUERY_KEYS.all, 'detail'] as const,
    list: (params: ListClientsProps) => [...CLIENT_QUERY_KEYS.lists(), params] as const,
    lists: () => [...CLIENT_QUERY_KEYS.all, 'list'] as const,
    stats: () => [...CLIENT_QUERY_KEYS.all, 'stats'] as const,
};

// List clients Hook
export const useClients = (params?: Omit<ListClientsProps, 'page'>) => {
    const {data, ...rest} = useInfiniteQuery({
        initialPageParam: 1,
        queryFn: async ({pageParam = 1}) => {
            const result = await ClientsAPI.listClients({
                ...params,
                page: pageParam,
            });
            if (result.isError) {
                throw result.error;
            }
            return {
                page: result.value.page || pageParam,
                page_size: result.value.page_size || 20,
                records: result.value.records,
                total: result.value.total,
            };
        },
        queryKey: CLIENT_QUERY_KEYS.list(params || {}),
        getNextPageParam: (lastPage) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.page_size);
            return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
        },
    });

    const clients = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data]);

    return {
        ...rest,
        clients,
    };
};

// Get Single Client Hook
export const useClient = (clientId: string) => {
    return useQuery({
        enabled: !!clientId,
        queryFn: async () => {
            const result = await ClientsAPI.getClient(clientId);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        queryKey: CLIENT_QUERY_KEYS.detail(clientId),
    });
};

// Get Membership Stats Hook
export const useMembershipStats = () => {
    return useQuery({
        queryFn: async () => {
            const result = await ClientsAPI.getMembershipStats();
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        queryKey: CLIENT_QUERY_KEYS.stats(),
    });
};

// Create Client Mutation
export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: CreateClientProps) => {
            const result = await ClientsAPI.createClient(variables);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.stats()});
        },
    });
};

// Update Client Mutation
export const useUpdateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {data: UpdateClientProps; id: string}) => {
            const result = await ClientsAPI.updateClient(variables.id, variables.data);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.detail(data.id)});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.stats()});
        },
    });
};

// Update Membership Status Mutation
export const useUpdateMembershipStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {clientId: string; status: MembershipStatusType}) => {
            const result = await ClientsAPI.updateMembershipStatus(variables.clientId, variables.status);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.detail(data.id)});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.stats()});
        },
    });
};

// Assign Coach Mutation
export const useAssignCoach = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {clientId: string; coachId: string}) => {
            const result = await ClientsAPI.assignCoach(variables.clientId, variables.coachId);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.detail(data.id)});
        },
    });
};

// Bulk Update Membership Status Mutation
export const useBulkUpdateMembershipStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {clientIds: string[]; status: MembershipStatusType}) => {
            const result = await ClientsAPI.bulkUpdateMembershipStatus(variables.clientIds, variables.status);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.stats()});
        },
    });
};

// Bulk Assign Coach Mutation
export const useBulkAssignCoach = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {clientIds: string[]; coachId: string}) => {
            const result = await ClientsAPI.bulkAssignCoach(variables.clientIds, variables.coachId);
            if (result.isError) {
                throw result.error;
            }
            return result.value;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CLIENT_QUERY_KEYS.lists()});
        },
    });
};
