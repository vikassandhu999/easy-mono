import {useNavigate, useParams} from 'react-router';
import {Alert, LoadingOverlay, Drawer} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';
import {useContent, useContentMutations} from '@/Hooks/useContentsQueries';
import {useInViewport} from '@mantine/hooks';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {useState} from 'react';
import {UpdateContentProps, ContentsAPI} from '@/Api/Contents';
import {ContentForm} from '@/Components/ContentForm';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import PaddingContainer from '@/Components/Containers/PaddingContainer';

import Header from './Header';
import HeroSection from './HeroSection';

export default function ContentDetailPage() {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const {data: content, isLoading, error} = useContent(id!);
    const {deleteContent, togglePublish} = useContentMutations();

    // Drawer states
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const queryClient = useQueryClient();

    // Track if title is visible for dynamic header
    const {ref: titleRef, inViewport: titleInViewport} = useInViewport<HTMLHeadingElement>();

    // Content update mutation
    const updateContentMutation = useMutation({
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
            setEditDrawerOpen(false);
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

    const handleEdit = () => {
        setEditDrawerOpen(true);
    };

    const handleDelete = () => {
        deleteContent(id!);
        navigate('/content');
    };

    const handleTogglePublish = () => {
        togglePublish(id!);
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
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                    color="red"
                >
                    {error?.message || 'Failed to load content'}
                </Alert>
            </PaddingContainer>
        );
    }

    return (
        <PagePaper>
            <HeadingContainer
                withBorder={false}
                style={{
                    paddingInline: 'var(--ce-size-lg)',
                    paddingBlock: 'var(--ce-size-sm)',
                }}
            >
                <Header
                    content={content}
                    showTitle={!titleInViewport}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePublish={handleTogglePublish}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <HeroSection
                    titleRef={titleRef}
                    content={content}
                />
            </PaddingContainer>

            {/* Edit Content Drawer */}
            <Drawer
                opened={editDrawerOpen}
                withCloseButton={false}
                onClose={() => setEditDrawerOpen(false)}
                position="right"
                size={'100%'}
                overlayProps={{backgroundOpacity: 0.55, blur: 3}}
                transitionProps={{transition: 'slide-left', duration: 200}}
            >
                {content && (
                    <ContentForm
                        mode="edit"
                        initialData={content}
                        onSubmit={(data) => updateContentMutation.mutate(data)}
                        onCancel={() => setEditDrawerOpen(false)}
                        isSubmitting={updateContentMutation.isPending}
                    />
                )}
            </Drawer>
        </PagePaper>
    );
}
