import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ContentsAPI, CreateContentProps, ListContentsProps, UpdateContentProps} from '@/api/contents.ts';
import {notifications} from '@mantine/notifications';

export interface ContentFilters extends Omit<ListContentsProps, 'page' | 'page_size'> {
    is_published?: boolean; // client-side filtering only
    page?: number;
    page_size?: number;
}

// Query keys
export const CONTENTS_QUERY_KEYS = {
    all: ['contents'] as const,
    lists: () => [...CONTENTS_QUERY_KEYS.all, 'list'] as const,
    list: (params: ContentFilters) => [...CONTENTS_QUERY_KEYS.lists(), params] as const,
    details: () => [...CONTENTS_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...CONTENTS_QUERY_KEYS.details(), id] as const,
};

// List contents with infinite query
export const useContents = (params: ContentFilters) => {
    return useInfiniteQuery({
        queryKey: CONTENTS_QUERY_KEYS.list(params),
        queryFn: async ({pageParam = 1}) => {
            const {...rest} = params;
            const result = await ContentsAPI.list({
                ...(rest as any),
                page: pageParam,
                page_size: params.page_size || 20,
            });
            console.log('Fetched contents:', result);
            if (result.isError) {
                throw result.getError();
            }
            console.log('Fetched contents:', result);

            return result.getValue();
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.records.length < (params.page_size || 20)) return undefined;
            return allPages.length + 1;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: true,
    });
};

// Get single content
export const useContent = (id: string | undefined) => {
    return useQuery({
        queryKey: CONTENTS_QUERY_KEYS.detail(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Content ID is required');
            const result = await ContentsAPI.get(id);
            return result.getValue();
        },
        enabled: !!id,
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
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            notifications.show({
                title: 'Success',
                message: 'Content created successfully',
                color: 'green',
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to create content',
                color: 'red',
            });
        },
    });
};

export const useUpdateContent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({id, data}: {id: string; data: UpdateContentProps}) => {
            const result = await ContentsAPI.update(id, data);
            return result.getValue();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.detail(variables.id)});
            notifications.show({
                title: 'Success',
                message: 'Content updated successfully',
                color: 'green',
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to update content',
                color: 'red',
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
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            notifications.show({
                title: 'Success',
                message: 'Content deleted successfully',
                color: 'green',
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to delete content',
                color: 'red',
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
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.lists()});
            queryClient.invalidateQueries({queryKey: CONTENTS_QUERY_KEYS.detail(id)});
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to update publish status',
                color: 'red',
            });
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
        updateContent: updateMutation.mutate,
        deleteContent: deleteMutation.mutate,
        togglePublish: togglePublishMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isTogglingPublish: togglePublishMutation.isPending,
    };
};
