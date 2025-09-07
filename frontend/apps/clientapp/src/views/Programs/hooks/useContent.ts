import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {CreateProgramContentProps, ProgramsAPI, UpdateProgramContentProps} from '@/Api/Programs';

// Fetch all program contents
export const useProgramContents = (programId: string) => {
    return useQuery({
        queryKey: ['program-contents', programId],
        queryFn: async () => {
            const result = await ProgramsAPI.listProgramContents(programId, {
                page: 1,
                page_size: 100,
            });
            return result.getValue();
        },
        enabled: !!programId,
    });
};

export const useProgramContentMutations = (programId: string) => {
    const queryClient = useQueryClient();

    const addContent = useMutation({
        mutationFn: async (data: CreateProgramContentProps) => {
            const result = await ProgramsAPI.createProgramContent(programId, data);
            return result.getValue();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['program-contents', programId],
            });
            notifications.show({
                title: 'Success',
                message: 'Content added to program',
                color: 'green',
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to add content',
                color: 'red',
            });
        },
    });

    const updateContent = useMutation({
        mutationFn: async ({contentId, data}: {contentId: string; data: UpdateProgramContentProps}) => {
            const result = await ProgramsAPI.updateProgramContent(programId, contentId, data);
            return result.getValue();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['program-contents', programId],
            });
            notifications.show({
                title: 'Success',
                message: 'Content updated',
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

    const removeContent = useMutation({
        mutationFn: async (contentId: string) => {
            const result = await ProgramsAPI.removeProgramContent(programId, contentId);
            return result.getValue();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['program-contents', programId],
            });
            notifications.show({
                title: 'Success',
                message: 'Content removed',
                color: 'green',
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to remove content',
                color: 'red',
            });
        },
    });

    const reorderContents = useMutation({
        mutationFn: async (items: Array<{id: string; sort_order: number}>) => {
            const result = await ProgramsAPI.reorderProgramContents(programId, items);
            return result.getValue();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['program-contents', programId],
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to reorder contents',
                color: 'red',
            });
        },
    });

    return {
        addContent: addContent.mutate,
        updateContent: updateContent.mutate,
        removeContent: removeContent.mutate,
        reorderContents: reorderContents.mutate,
        isAdding: addContent.isPending,
        isUpdating: updateContent.isPending,
        isRemoving: removeContent.isPending,
        isReordering: reorderContents.isPending,
    };
};
