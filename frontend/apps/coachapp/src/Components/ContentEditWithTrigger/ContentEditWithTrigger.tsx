import {Drawer, LoadingOverlay} from '@mantine/core';
import React, {useState} from 'react';
import {ContentForm} from '../ContentForm';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useContent} from '@/Hooks/useContentsQueries';
import {UpdateContentProps, ContentsAPI} from '@/Api/Contents';
import {notifications} from '@mantine/notifications';

type RenderProps = {
    onClick: (id: string) => void;
};

type ContentEditWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ContentEditWithTrigger({children}: ContentEditWithTriggerProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [id, setId] = useState<string | null>(null);

    const {data: content, isLoading, error} = useContent(id);

    const updateContent = useMutation({
        mutationFn: async (data: UpdateContentProps) => {
            const result = await ContentsAPI.updateContent(id!, data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['content', id], data);
            queryClient.invalidateQueries({queryKey: ['contents']});
            notifications.show({
                title: 'Success',
                message: `"${variables.name || 'Content'}" updated successfully`,
                color: 'green',
                autoClose: 1000,
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to update content',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const onClick = (id: string) => {
        setId(id);
        setOpen(true);
    };

    return (
        <>
            {children({onClick})}
            <Drawer
                opened={open}
                onClose={() => setOpen(false)}
                withCloseButton={false}
                size="100%"
            >
                {isLoading && <LoadingOverlay visible />}
                {error && <div>{error.message}</div>}
                {content && (
                    <ContentForm
                        initialData={content}
                        mode="edit"
                        onSubmit={async (values) => {
                            await updateContent.mutateAsync(values);
                            setOpen(false);
                        }}
                        onCancel={() => setOpen(false)}
                        isSubmitting={updateContent.isPending}
                    />
                )}
            </Drawer>
        </>
    );
}
