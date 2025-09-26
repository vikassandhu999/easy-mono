import {Alert, Drawer, Stack, Text} from '@mantine/core';
import {modals} from '@mantine/modals';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle} from '@tabler/icons-react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import {Content, ContentsAPI, CreateContentProps, UpdateContentProps} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs.tsx';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import ContentForm from '@/components/ContentForm';
import CEDrawer from '@/components/EasyDrawer/EasyDrawer';
import Header from '@/components/layouts/Header';
import RecordsList from '@/components/layouts/RecordsList';
import {useDeleteContentMutation, useGetContentQuery, useListContentsInfiniteQuery} from '@/store/services/contentsApi';

import {EmptyState} from './EmptyState';
import ContentHeader from './ListHeader';
import ContentListItem from './ListItem';

function ContentListPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');

    const contentType = searchParams.get('type') as Content['type'];

    // Drawer states
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editingContentId, setEditingContentId] = useState<null | string>(null);

    const queryClient = useQueryClient();

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListContentsInfiniteQuery({
        content_type: (contentType as any) || undefined,
        page_size: 20,
        search: search?.trim(),
    });

    const [deleteContent] = useDeleteContentMutation();
    const {data: editingContent, isLoading: editingContentLoading} = useGetContentQuery(
        {id: editingContentId!},
        {
            skip: !editingContentId,
        },
    );

    // Content creation mutation
    const createContentMutation = useMutation({
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
        onSuccess: (data) => {
            queryClient.invalidateQueries({queryKey: ['contents']});
            notifications.show({
                autoClose: 1000,
                color: 'green',
                message: 'Content created successfully',
                title: 'Success',
            });
            setCreateDrawerOpen(false);
            navigate(`/content/${data.id}`);
        },
    });

    // Content update mutation
    const updateContentMutation = useMutation({
        mutationFn: async (data: UpdateContentProps) => {
            const result = await ContentsAPI.update(editingContentId!, data);
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
            queryClient.setQueryData(['content', editingContentId], data);
            queryClient.invalidateQueries({queryKey: ['contents']});
            notifications.show({
                autoClose: 1000,
                color: 'green',
                message: `"${variables.name || 'Content'}" updated successfully`,
                title: 'Success',
            });
            setEditDrawerOpen(false);
            setEditingContentId(null);
        },
    });

    const allContents = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data]);

    const handleEdit = (id: string) => {
        setEditingContentId(id);
        setEditDrawerOpen(true);
    };

    const handleView = (id: string) => navigate(`/content/${id}`);

    const handleCreate = () => {
        setCreateDrawerOpen(true);
    };

    const handleDelete = (contentId: string) => {
        const content = allContents.find((c) => c.id === contentId);
        if (!content) return;

        modals.openConfirmModal({
            children: (
                <Stack gap="sm">
                    <Text size="sm">Are you sure you want to delete "{content.name}"?</Text>
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={16} />}
                    >
                        <Text size="sm">This action cannot be undone. The content will be permanently removed.</Text>
                    </Alert>
                </Stack>
            ),
            confirmProps: {color: 'red'},
            labels: {cancel: 'Cancel', confirm: 'Delete'},
            onConfirm: () => deleteContent(contentId),
            title: 'Delete Content',
        });
    };

    return (
        <>
            <ContentHeader
                onCreateContent={handleCreate}
                onSearchChange={(value) => setSearch(value)}
                title={CONTENT_TYPE_CONFIG[contentType].label}
            />
            <PagePaper>
                <PaddingContainer
                    paddingX={'lg'}
                    paddingY={'md'}
                >
                    <RecordsList<Content>
                        emptyState={
                            <EmptyState
                                onCreateContent={handleCreate}
                                search={search}
                            />
                        }
                        fetchNextPage={fetchNextPage}
                        gap="md"
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        isLoading={isLoading}
                        itemKey={(item) => item.id}
                        loadMoreText="Load More Content"
                        records={allContents}
                        renderItem={(content) => (
                            <ContentListItem
                                content={content}
                                key={content.id}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onView={handleView}
                            />
                        )}
                    />
                </PaddingContainer>

                {/* Create Content Drawer */}
                <CEDrawer
                    header={
                        <HeadingContainer>
                            <Header
                                onBack={() => setCreateDrawerOpen(false)}
                                title="Create Content"
                            />
                        </HeadingContainer>
                    }
                    onClose={() => setCreateDrawerOpen(false)}
                    opened={createDrawerOpen}
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
                                isSubmitting={createContentMutation.isPending}
                                mode="create"
                                onSubmit={(data) => createContentMutation.mutate(data)}
                            />
                        </PaddingContainer>
                    </PagePaper>
                </CEDrawer>

                {/* Edit Content Drawer */}
                <Drawer
                    onClose={() => {
                        setEditDrawerOpen(false);
                        setEditingContentId(null);
                    }}
                    opened={editDrawerOpen}
                    overlayProps={{backgroundOpacity: 0.55, blur: 3}}
                    position="right"
                    size={'100%'}
                    transitionProps={{duration: 200, transition: 'slide-left'}}
                    withCloseButton={false}
                >
                    {editingContent && !editingContentLoading && (
                        <ContentForm
                            initialData={editingContent}
                            isSubmitting={updateContentMutation.isPending}
                            mode="edit"
                            onSubmit={(data) => updateContentMutation.mutate(data)}
                        />
                    )}
                </Drawer>
            </PagePaper>
        </>
    );
}

export default ContentListPage;
