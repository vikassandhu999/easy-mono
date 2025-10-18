import {
    Alert,
    Button,
    Center,
    Chip,
    Group,
    LoadingOverlay,
    ScrollArea,
    SegmentedControl,
    Space,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {modals} from '@mantine/modals';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconPlus, IconRefresh} from '@tabler/icons-react';
import {FC, useEffect, useState} from 'react';

import {Content, ContentType} from '@/api/contents';
import {ContentBuilder} from '@/components/ContentBuilder';

import {CONTENT_TYPE_CONFIG} from '../Configs';
import HeadingContainer from '../containers/HeaderContainer';
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

    const handleCreateClick = (contentType: ContentType) => {
        modals.open({
            modalId: `create-${contentType}`,
            title: config.createTitle,
            size: 'xl',
            centered: true,
            styles: {
                body: {
                    padding: 0,
                },
                title: {
                    fontWeight: 600,
                    fontSize: 'var(--mantine-font-size-lg)',
                },
            },
            children: (
                <ContentBuilder
                    contentType={contentType}
                    onComplete={() => {
                        modals.close(`create-${contentType}`);
                        refetch();
                    }}
                    showSaveOptions
                />
            ),
        });
    };

    const handleContentClick = (content: Content) => {
        if (onContentClick) {
            onContentClick(content);
        } else {
            modals.open({
                modalId: `edit-${selectedTab}-${content.id}`,
                title: content.name,
                fullScreen: true,

                centered: true,
                styles: {
                    body: {
                        padding: 0,
                    },
                    title: {
                        fontWeight: 600,
                        fontSize: 'var(--mantine-font-size-lg)',
                    },
                },
                children: (
                    <ContentBuilder
                        contentId={content.id}
                        onComplete={() => {
                            modals.close(`edit-${selectedTab}-${content.id}`);
                            refetch();
                            clearSelection();
                        }}
                        showSaveOptions
                    />
                ),
            });
        }
    };

    return (
        <>
            <HeadingContainer withBorder={false}>
                <Stack gap="md">
                    <Title order={5}>Library</Title>
                    <Text
                        c="dimmed"
                        fs="italic"
                        size="xs"
                        style={{
                            lineHeight: 'var(--callout-line-height)',
                        }}
                    >
                        Manage and curate all exercises and recipes for your coaching programs.
                    </Text>

                    <ScrollArea
                        scrollbars="x"
                        type="never"
                        w="100%"
                    >
                        <SegmentedControl
                            data={Object.entries(CONTENT_TYPE_CONFIG)
                                .filter(([key]) => VISIBILE_CONTENT_TYPE.includes(key as ContentType))
                                .map(([, config]) => ({
                                    value: config.value,
                                    label: (
                                        <Center style={{gap: 6}}>
                                            <config.icon
                                                size={16}
                                                stroke={1.5}
                                            />
                                            <span>{config.label}s</span>
                                        </Center>
                                    ),
                                }))}
                            fullWidth
                            onChange={(value) => setSelectedTab(value as ContentType)}
                            radius="xl"
                            size="lg"
                            value={selectedTab}
                        />
                    </ScrollArea>

                    <Group
                        align="start"
                        justify="space-between"
                        wrap="nowrap"
                    >
                        <TextInput
                            flex={1}
                            onChange={(event) => setSearch(event.currentTarget.value)}
                            placeholder={config.searchPlaceholder}
                            radius="xl"
                            size="sm"
                            value={search}
                            variant="filled"
                        />
                        <Button
                            onClick={() => {
                                handleCreateClick(selectedTab as ContentType);
                            }}
                            radius="xl"
                            rightSection={<IconPlus size={16} />}
                            size="sm"
                        >
                            {config.createTitle}
                        </Button>
                    </Group>

                    <Chip.Group
                        onChange={(value) => setScopeFilter(value as any)}
                        value={scopeFilter}
                    >
                        <Group
                            justify="left"
                            my="sm"
                        >
                            {scopeFilters.map((filter, idx) => {
                                const displayLabel = filter === 'business' ? 'Custom' : filter;
                                return (
                                    <Chip
                                        key={`scope-filter-${idx}`}
                                        radius="xl"
                                        size="sm"
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
                    icon={<IconAlertCircle size={16} />}
                    title="Error loading content"
                    variant="light"
                >
                    <Stack gap="sm">
                        <Text size="sm">
                            We couldn't load your {config.pluralLabel.toLowerCase()}. This might be a temporary issue.
                        </Text>
                        <Button
                            color="red"
                            leftSection={<IconRefresh size={16} />}
                            onClick={() => refetch()}
                            radius="xl"
                            size="sm"
                            variant="light"
                        >
                            Try Again
                        </Button>
                    </Stack>
                </Alert>
            )}

            {!isLoading && !isError && contents.length === 0 && (
                <Stack
                    align="center"
                    gap="md"
                    py="xl"
                >
                    <Text
                        c="dimmed"
                        size="sm"
                        ta="center"
                    >
                        No {config.pluralLabel.toLowerCase()} found. Click on the{' '}
                        <Text
                            component="span"
                            fw={600}
                        >
                            {config.createTitle}
                        </Text>{' '}
                        button to create one.
                    </Text>
                </Stack>
            )}

            {selectedTab === 'exercise' &&
                contents.map((content) => (
                    <div key={content.id}>
                        <ExerciseCard
                            content={content}
                            onClick={() => handleContentClick(content)}
                        />
                        <Space h="md" />
                    </div>
                ))}
            {selectedTab === 'recipe' &&
                contents.map((content) => (
                    <div key={content.id}>
                        <RecipeCard
                            content={content}
                            onClick={() => handleContentClick(content)}
                        />
                        <Space h="md" />
                    </div>
                ))}

            {hasNextPage && (
                <Button
                    disabled={isFetchingNextPage}
                    mt="sm"
                    onClick={() => fetchNextPage()}
                    radius="xl"
                    size="xs"
                    variant="subtle"
                >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </Button>
            )}
        </>
    );
};
