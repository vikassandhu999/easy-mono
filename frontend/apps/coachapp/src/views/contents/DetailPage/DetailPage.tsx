import {Alert, Drawer, LoadingOverlay} from '@mantine/core';
import {useInViewport} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle} from '@tabler/icons-react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {ContentsAPI, UpdateContentProps} from '@/api/contents.ts';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import ContentForm from '@/components/ContentForm';
import {useDeleteContentMutation, useGetContentQuery} from '@/store/services/contentsApi';

import Header from './Header';
import HeroSection from './HeroSection';

export default function ContentDetailPage() {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const {data: content, error, isLoading} = useGetContentQuery({id: id!}, {skip: !id});
    const [deleteContent] = useDeleteContentMutation();

    // Drawer states
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const queryClient = useQueryClient();

    // Track if title is visible for dynamic header
    const {inViewport: titleInViewport, ref: titleRef} = useInViewport<HTMLHeadingElement>();

    // Content update mutation
    const updateContentMutation = useMutation({
        mutationFn: async (data: UpdateContentProps) => {
            const result = await ContentsAPI.update(id!, data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                autoClose: 1000,
                color: 'red',
                message: 'Failed to update content',
                title: 'Error',
            });
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['content', id], data);
            queryClient.invalidateQueries({queryKey: ['contents']});
            notifications.show({
                autoClose: 1000,
                color: 'green',
                message: `"${variables.name || 'Content'}" updated successfully`,
                title: 'Success',
            });
            setEditDrawerOpen(false);
        },
    });

    const handleEdit = () => {
        setEditDrawerOpen(true);
    };

    const handleDelete = () => {
        deleteContent(id!);
        navigate(-1);
    };

    const handleTogglePublish = () => {
        // TODO: Implement toggle publish functionality with RTK Query
        // The old implementation called ContentsAPI.update(id, {}) which might have
        // toggled publish status on the backend. Need to investigate the backend API.
        console.warn('Toggle publish not yet implemented with RTK Query');
    };

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingOverlay visible />
            </PaddingContainer>
        );
    }

    if (error || !content) {
        return (
            <PaddingContainer>
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                >
                    {error?.message || 'Failed to load content'}
                </Alert>
            </PaddingContainer>
        );
    }

    return (
        <PagePaper>
            <HeadingContainer
                style={{
                    paddingBlock: 'var(--ce-size-sm)',
                    paddingInline: 'var(--ce-size-lg)',
                }}
                withBorder={false}
            >
                <Header
                    content={content}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onTogglePublish={handleTogglePublish}
                    showTitle={!titleInViewport}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <HeroSection
                    content={content}
                    titleRef={titleRef}
                />
            </PaddingContainer>

            {/* Edit Content Drawer */}
            <Drawer
                onClose={() => setEditDrawerOpen(false)}
                opened={editDrawerOpen}
                overlayProps={{backgroundOpacity: 0.55, blur: 3}}
                position="right"
                size={'100%'}
                transitionProps={{duration: 200, transition: 'slide-left'}}
                withCloseButton={false}
            >
                {content && (
                    <ContentForm
                        initialData={content}
                        isSubmitting={updateContentMutation.isPending}
                        mode="edit"
                        onSubmit={(data) => updateContentMutation.mutate(data)}
                    />
                )}
            </Drawer>
        </PagePaper>
    );
}
