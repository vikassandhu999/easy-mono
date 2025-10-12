import {Button, Chip, Group, Space, TextInput} from '@mantine/core';
import {modals} from '@mantine/modals';
import {IconPlus, IconPointFilled} from '@tabler/icons-react';
import {FC} from 'react';

import {Content, ContentType} from '@/api/contents';
import {ContentBuilder} from '@/components/ContentBuilder';

import {ContentCard} from './cards';
import {useContentList, useContentSelection} from './hooks/useContentList';
import {getContentTypeConfig} from './types/contentTypes';

interface ContentListViewProps {
    contentType: ContentType;
    onContentClick?: (content: Content) => void;
}

/**
 * Unified content list view component
 * Handles create/edit modals, search, filters, and list rendering for any content type
 */
export const ContentListView: FC<ContentListViewProps> = ({contentType, onContentClick}) => {
    const config = getContentTypeConfig(contentType);
    const {clearSelection} = useContentSelection<Content>();

    const {
        contents,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        search,
        setSearch,
        accessLevelFilter,
        accessLevelFilters,
        setAccessLevelFilter,
        fetchNextPage,
        refetch,
    } = useContentList({contentType});

    const handleCreateClick = () => {
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
                modalId: `edit-${contentType}-${content.id}`,
                title: content.name,
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
                        contentId={content.id}
                        onComplete={() => {
                            modals.close(`edit-${contentType}-${content.id}`);
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
            {/* Search and Create Button */}
            <Group
                align="start"
                justify="space-between"
                wrap="nowrap"
            >
                <TextInput
                    flex={1}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder={config.searchPlaceholder}
                    radius="md"
                    size="sm"
                    value={search}
                />
                <Button
                    onClick={handleCreateClick}
                    radius="md"
                    rightSection={<IconPlus size={16} />}
                    size="sm"
                >
                    {config.createTitle}
                </Button>
            </Group>

            {/* Access Level Filters */}
            <Chip.Group
                onChange={(v) => setAccessLevelFilter(v as any)}
                value={accessLevelFilter}
            >
                <Group
                    justify="left"
                    my="sm"
                >
                    {accessLevelFilters.map((filter, idx) => (
                        <Chip
                            icon={<IconPointFilled />}
                            key={`access-level-${idx}`}
                            size="xs"
                            style={{textTransform: 'capitalize'}}
                            value={filter}
                            variant="outline"
                        >
                            {filter}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>

            {/* Loading State */}
            {isLoading && <div>Loading {config.pluralLabel.toLowerCase()}...</div>}

            {/* Content List */}
            {contents.map((content) => (
                <div key={content.id}>
                    <ContentCard
                        content={content}
                        onClick={() => handleContentClick(content)}
                    />
                    <Space h="md" />
                </div>
            ))}

            {/* Load More Button */}
            {hasNextPage && (
                <Button
                    disabled={isFetchingNextPage}
                    mt="sm"
                    onClick={() => fetchNextPage()}
                    radius="md"
                    size="xs"
                    variant="subtle"
                >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </Button>
            )}
        </>
    );
};
