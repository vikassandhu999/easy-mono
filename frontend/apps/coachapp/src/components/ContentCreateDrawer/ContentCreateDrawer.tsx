import {useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';

import {Content, ContentsAPI, CreateContentProps} from '@/api/contents.ts';
import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper.tsx';
import ContentForm from '@/components/ContentForm';
import CEDrawer from '@/components/EasyDrawer/EasyDrawer';
import Header from '@/components/layouts/Header';

export default function ContentCreateDrawer({
    contentType,
    onCreated,
    stack,
}: {
    contentType: Content['type'];
    onCreated: (content: Content) => void;
    stack: ReturnType<typeof useDrawersStack<'content-create'>>;
}) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: CreateContentProps) => {
            const result = await ContentsAPI.create(data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                autoClose: 1000,
                color: 'red',
                message: 'Failed to create content',
                title: 'Error',
            });
        },
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({queryKey: ['contents']});
            onCreated(data.result);
        },
    });

    const onClose = () => {
        stack.close('content-create');
    };

    return (
        <CEDrawer
            {...stack.register('content-create')}
            header={
                <HeadingContainer>
                    <Header
                        onBack={onClose}
                        title="Create Content"
                    />
                </HeadingContainer>
            }
            onClose={onClose}
            overlayProps={{backgroundOpacity: 0.55, blur: 3}}
            position="right"
            size={'100%'}
            transitionProps={{duration: 200, transition: 'slide-left'}}
            withCloseButton={false}
        >
            <PagePaper>
                <PaddingContainer>
                    <ContentForm
                        initialData={{type: contentType}}
                        isSubmitting={mutation.isPending}
                        mode="create"
                        onSubmit={(data) => mutation.mutate(data)}
                    />
                </PaddingContainer>
            </PagePaper>
        </CEDrawer>
    );
}
