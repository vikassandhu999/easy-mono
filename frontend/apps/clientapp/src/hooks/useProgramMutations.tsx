import {useMutation, useQueryClient} from '@tanstack/react-query';
import {CreateProgramProps, ProgramsAPI, UpdateProgramProps} from '@/Api/Programs';
import {notifications} from '@mantine/notifications';
import {useNavigate} from 'react-router';

export const useProgramMutations = (id?: string, onSuccess?: () => void) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const createMutation = useMutation({
        mutationFn: async (data: CreateProgramProps) => {
            const result = await ProgramsAPI.createProgram(data);
            return result.getValue();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({queryKey: ['programs']});
            notifications.show({
                title: 'Success',
                message: `"${variables.name}" created successfully`,
                color: 'green',
                autoClose: 1000,
            });
            navigate(`/programs/${data.id}`);
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to create program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: UpdateProgramProps) => {
            if (!id) throw new Error('Program ID is required');
            const result = await ProgramsAPI.updateProgram(id, data);
            return result.getValue();
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['program', id], data);
            queryClient.invalidateQueries({queryKey: ['programs']});
            notifications.show({
                title: 'Success',
                message: `"${variables.name || 'Program'}" updated successfully`,
                color: 'green',
                autoClose: 1000,
            });
            // Call the callback if provided
            onSuccess?.();
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to update program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            if (!id) throw new Error('Program ID is required');
            const result = await ProgramsAPI.publishProgram(id);
            return result.getValue();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['program', id], data);
            queryClient.invalidateQueries({queryKey: ['programs']});
            notifications.show({
                title: 'Success',
                message: 'Program published successfully',
                color: 'green',
                autoClose: 1000,
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to publish program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const unpublishMutation = useMutation({
        mutationFn: async () => {
            if (!id) throw new Error('Program ID is required');
            const result = await ProgramsAPI.unpublishProgram(id);
            return result.getValue();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['program', id], data);
            queryClient.invalidateQueries({queryKey: ['programs']});
            notifications.show({
                title: 'Success',
                message: 'Program unpublished successfully',
                color: 'green',
                autoClose: 1000,
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to unpublish program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    return {
        create: createMutation.mutate,
        update: updateMutation.mutate,
        publish: publishMutation.mutate,
        unpublish: unpublishMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isPublishing: publishMutation.isPending,
        isUnpublishing: unpublishMutation.isPending,
    };
};
