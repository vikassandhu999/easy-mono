import {Drawer} from '@mantine/core';
import React, {useState} from 'react';
import {ContentForm} from '../ContentForm';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {CreateContentProps, ContentsAPI} from '@/Api/Contents';
import {notifications} from '@mantine/notifications';
import {useNavigate} from 'react-router';

type RenderProps = {
    onClick: () => void;
};

type ContentCreateWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ContentCreateWithTrigger({children}: ContentCreateWithTriggerProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const createContent = useMutation({
        mutationFn: async (data: CreateContentProps) => {
            const result = await ContentsAPI.createContent(data);

            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },

        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: ['contents']});
            notifications.show({
                title: 'Success',
                message: 'Content created successfully',
                color: 'green',
                autoClose: 1000,
            });
            navigate(`/content/${data.id}`);
            setOpen(false);
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to create content',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const onClick = () => {
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
                <ContentForm
                    mode="create"
                    initialData={null}
                    onSubmit={async (values) => {
                        await createContent.mutateAsync(values);
                    }}
                    onCancel={() => setOpen(false)}
                    isSubmitting={createContent.isPending}
                />
            </Drawer>
        </>
    );
}
