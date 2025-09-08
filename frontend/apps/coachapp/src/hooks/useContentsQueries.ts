import {notifications} from '@mantine/notifications';
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {ContentsAPI, CreateContentProps, ListContentsProps, UpdateContentProps} from '@/api/contents.ts';

export interface ContentFilters extends Omit<ListContentsProps, 'page' | 'page_size'> {
    is_published?: boolean; // client-side filtering only
    page?: number;
    page_size?: number;
}

// Query keys
export const CONTENTS_QUERY_KEYS = {
    all: ['contents'] as const,
    detail: (id: string) => [...CONTENTS_QUERY_KEYS.details(), id] as const,
    details: () => [...CONTENTS_QUERY_KEYS.all, 'detail'] as const,
    list: (params: ContentFilters) => [...CONTENTS_QUERY_KEYS.lists(), params] as const,
    lists: () => [...CONTENTS_QUERY_KEYS.all, 'list'] as const,
};

// List contents with infinite query
export const useContents = (params: ContentFilters) => {
    return useInfiniteQuery({
        enabled: true,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.records.length < (params.page_size || 20)) return undefined;
            return allPages.length + 1;
        },
        initialPageParam: 1,
        queryFn: async ({pageParam = 1}) => {
            const {...rest} = params;
            const result = await ContentsAPI.list({
                ...(rest as any),
                page: pageParam,
                page_size: params.page_size || 20,
            });
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: CONTENTS_QUERY_KEYS.list(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get single content
export const useContent = (id: string | undefined) => {
    return useQuery({
        enabled: !!id,
        queryFn: async () => {
            if (!id) throw new Error('Content ID is required');
            const result = await ContentsAPI.get(id);
            return result.getValue();
        },
        queryKey: CONTENTS_QUERY_KEYS.detail(id || ''),
    });
};

// Content mutations
export const useCreateContent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateContentProps) => {
            const result = await ContentsAPI.create(data);
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                color: 'red',
                message: 'Failed to create content',
                title: 'Error',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            notifications.show({
                color: 'green',
                message: 'Content created successfully',
                title: 'Success',
            });
        },
    });
};

export const useUpdateContent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({data, id}: {data: UpdateContentProps; id: string}) => {
            const result = await ContentsAPI.update(id, data);
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                color: 'red',
                message: 'Failed to update content',
                title: 'Error',
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.detail(variables.id)});
            notifications.show({
                color: 'green',
                message: 'Content updated successfully',
                title: 'Success',
            });
        },
    });
};

export const useDeleteContent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const result = await ContentsAPI.archive(id);
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                color: 'red',
                message: 'Failed to delete content',
                title: 'Error',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            notifications.show({
                color: 'green',
                message: 'Content deleted successfully',
                title: 'Success',
            });
        },
    });
};

export const useToggleContentPublish = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const result = await ContentsAPI.update(id, {});
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                color: 'red',
                message: 'Failed to update publish status',
                title: 'Error',
            });
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.detail(id)});
        },
    });
};

// Legacy hook for backwards compatibility
export const useContentMutations = () => {
    const createMutation = useCreateContent();
    const updateMutation = useUpdateContent();
    const deleteMutation = useDeleteContent();
    const togglePublishMutation = useToggleContentPublish();

    return {
        createContent: createMutation.mutate,
        deleteContent: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isTogglingPublish: togglePublishMutation.isPending,
        isUpdating: updateMutation.isPending,
        togglePublish: togglePublishMutation.mutate,
        updateContent: updateMutation.mutate,
    };
};
