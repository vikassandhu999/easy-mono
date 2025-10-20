import {
    Alert,
    Button,
    Chip,
    Flex,
    Group,
    Image,
    LoadingOverlay,
    ScrollArea,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconPlus, IconRefresh} from '@tabler/icons-react';
import {FC, useEffect, useState} from 'react';

import HeadingContainer from '@/components/containers/HeaderContainer';
import {ContentBuilderDrawer} from '@/components/ContentBuilder';
import Header from '@/components/layouts/Header';
import RecordsList from '@/components/layouts/RecordsList';
import {Content, ContentType} from '@/store/services/contents';

import EmptyLibraryImage from '../../../public/empty_plan.png';
import {CONTENT_TYPE_CONFIG} from '../Configs';
import {ExerciseCard} from './ExerciseCard';
import {useContentList, useContentSelection} from './hooks/useContentList';
import {RecipeCard} from './RecipeCard';
import {getContentTypeConfig} from './types/contentTypes';

interface ContentListViewProps {
    onContentClick?: (content: Content) => void;
}

/**
 * Unified content list view component
 * Handles create/edit modals, search, filters, and list rendering for any content type
 */

const VISIBILE_CONTENT_TYPE: ContentType[] = ['exercise', 'recipe'];

export const ContentListView: FC<ContentListViewProps> = ({onContentClick}) => {
    const [selectedTab, setSelectedTab] = useState<ContentType>(VISIBILE_CONTENT_TYPE[0]);
    const [createDrawerOpened, setCreateDrawerOpened] = useState(false);
    const [editDrawerOpened, setEditDrawerOpened] = useState(false);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);

    const config = getContentTypeConfig(selectedTab as ContentType);
    const {clearSelection} = useContentSelection<Content>();

    const {
        contents,
        isLoading,
        isError,
        error,
        hasNextPage,
        isFetchingNextPage,
        search,
        setSearch,
        scopeFilter,
        scopeFilters,
        setScopeFilter,
        fetchNextPage,
        refetch,
    } = useContentList({contentType: selectedTab});

    // Show error notification when query fails
    useEffect(() => {
        if (isError && error) {
            notifications.show({
                title: 'Failed to load content',
                message: 'There was an error loading the content list. Please try again.',
                color: 'red',
                autoClose: 5000,
            });
        }
    }, [isError, error]);

    const handleCreateClick = () => {
        setCreateDrawerOpened(true);
    };

    const handleContentClick = (content: Content) => {
        if (onContentClick) {
            onContentClick(content);
        } else {
            setSelectedContent(content);
            setEditDrawerOpened(true);
        }
    };

    const handleCreateComplete = () => {
        setCreateDrawerOpened(false);
        refetch();
    };

    const handleEditComplete = () => {
        setEditDrawerOpened(false);
        setSelectedContent(null);
        refetch();
        clearSelection();
    };

    return (
        <>
            <ContentBuilderDrawer
                contentType={selectedTab}
                onClose={() => setCreateDrawerOpened(false)}
                onComplete={handleCreateComplete}
                opened={createDrawerOpened}
                showSaveOptions={false}
                title={config.createTitle}
            />

            <ContentBuilderDrawer
                contentId={selectedContent?.id}
                contentType={selectedTab}
                onClose={() => {
                    setEditDrawerOpened(false);
                    setSelectedContent(null);
                }}
                onComplete={handleEditComplete}
                opened={editDrawerOpened}
                showSaveOptions
                title={selectedContent?.name || ''}
            />

            <HeadingContainer>
                <Stack gap="sm">
                    <Header
                        actions={
                            <Group gap="xs">
                                <Button
                                    onClick={handleCreateClick}
                                    radius="xl"
                                    rightSection={<IconPlus size={18} />}
                                    size="md"
                                >
                                    {config.createTitle}
                                </Button>
                            </Group>
                        }
                        title="Library"
                    />

                    {/* Description */}
                    <Text
                        c="dimmed"
                        size="md"
                    >
                        Manage and curate all exercises and recipes for your coaching programs.
                    </Text>

                    {/* Discipline Filter */}
                    <ScrollArea
                        scrollbars="x"
                        type="never"
                        w="100%"
                    >
                        <SegmentedControl
                            aria-label="Filter library by content type"
                            data={Object.entries(CONTENT_TYPE_CONFIG)
                                .filter(([key]) => VISIBILE_CONTENT_TYPE.includes(key as ContentType))
                                .map(([, config]) => ({
                                    value: config.value,
                                    label: (
                                        <Group
                                            gap="xs"
                                            wrap="nowrap"
                                        >
                                            <config.icon
                                                size={16}
                                                stroke={1.5}
                                            />
                                            <span>{config.label}s</span>
                                        </Group>
                                    ),
                                }))}
                            fullWidth
                            onChange={(value) => setSelectedTab(value as ContentType)}
                            radius="xl"
                            size="md"
                            value={selectedTab}
                        />
                    </ScrollArea>

                    {/* Search */}
                    <TextInput
                        aria-label="Search content"
                        label="Search"
                        onChange={(event) => setSearch(event.currentTarget.value)}
                        placeholder={config.searchPlaceholder}
                        radius="xl"
                        size="lg"
                        value={search}
                        variant="filled"
                    />

                    {/* Scope Filter Chips */}
                    <Chip.Group
                        onChange={(value) => setScopeFilter(value as any)}
                        value={scopeFilter}
                    >
                        <Group justify="left">
                            {scopeFilters.map((filter, idx) => {
                                const displayLabel = filter === 'business' ? 'Custom' : filter;
                                return (
                                    <Chip
                                        key={`scope-filter-${idx}`}
                                        radius="xl"
                                        size="md"
                                        style={{textTransform: 'capitalize'}}
                                        value={filter}
                                        variant="outline"
                                    >
                                        {displayLabel}
                                    </Chip>
                                );
                            })}
                        </Group>
                    </Chip.Group>
                </Stack>
            </HeadingContainer>

            {isLoading && (
                <LoadingOverlay
                    loaderProps={{
                        type: 'bars',
                    }}
                    visible={isLoading}
                />
            )}

            {isError && !isLoading && (
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={20} />}
                    title="Error loading content"
                    variant="light"
                >
                    <Stack gap="sm">
                        <Text size="md">
                            We couldn't load your {config.pluralLabel.toLowerCase()}. This might be a temporary issue.
                        </Text>
                        <Button
                            color="red"
                            leftSection={<IconRefresh size={18} />}
                            onClick={() => refetch()}
                            radius="xl"
                            size="lg"
                            variant="light"
                        >
                            Try again
                        </Button>
                    </Stack>
                </Alert>
            )}

            {!isLoading && !isError && contents.length === 0 && (
                <Flex
                    align="center"
                    direction="column"
                    gap="md"
                    justify="center"
                    px="md"
                >
                    <Image
                        alt={search ? 'No results illustration' : 'Empty library illustration'}
                        src={EmptyLibraryImage}
                        w={240}
                    />
                    <Stack
                        align="center"
                        gap="xs"
                    >
                        <Title
                            order={3}
                            ta="center"
                        >
                            {search ? `No results for "${search}"` : `Create your first ${config.label.toLowerCase()}`}
                        </Title>
                        <Text
                            c="dimmed"
                            maw={400}
                            size="md"
                            ta="center"
                        >
                            {search
                                ? 'Try different keywords or create new content.'
                                : `Add ${config.pluralLabel.toLowerCase()} to build your content library.`}
                        </Text>
                    </Stack>
                </Flex>
            )}

            <RecordsList<Content>
                emptyState={null}
                fetchNextPage={fetchNextPage}
                gap={0}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                itemKey={(item) => item.id}
                loadMoreText={`Load more ${config.pluralLabel.toLowerCase()}`}
                records={contents}
                renderItem={(content) =>
                    selectedTab === 'exercise' ? (
                        <ExerciseCard
                            content={content}
                            key={content.id}
                            onClick={() => handleContentClick(content)}
                        />
                    ) : (
                        <RecipeCard
                            content={content}
                            key={content.id}
                            onClick={() => handleContentClick(content)}
                        />
                    )
                }
            />
        </>
    );
};
