/**
 * Content List View Component
 *
 * Main view component for displaying library content lists.
 * Handles data fetching, filtering, and content display.
 *
 * Architecture:
 * - Separated business logic into hooks
 * - Extracted presentational components
 * - Clear separation of concerns
 * - Memoized for performance
 */

import {LoadingOverlay, Stack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {memo, useCallback, useEffect} from 'react';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import {ExerciseCard} from '@/shared/Content/ExerciseCard';
import {useContentList} from '@/shared/Content/hooks/useContentList';
import {RecipeCard} from '@/shared/Content/RecipeCard';
import RecordsList from '@/shared/layouts/RecordsList';
import {Content} from '@/services/contents';

import {
    ContentTypeFilter,
    LibraryEmptyState,
    LibraryErrorState,
    LibraryHeader,
    LibrarySearch,
    ScopeFilterChips,
} from '../../components';
import {CONTENT_TYPE_UI_CONFIG, NOTIFICATIONS} from '../../constants';
import {ContentListViewProps} from '../../types';

/**
 * Content list view with filters, search, and infinite scroll
 */
export const ContentListView = memo<ContentListViewProps>(
    ({contentType, onContentClick, onContentTypeChange, onCreateClick}) => {
        const config = CONTENT_TYPE_UI_CONFIG[contentType];

        const {
            contents,
            error,
            fetchNextPage,
            hasNextPage,
            isError,
            isFetchingNextPage,
            isLoading,
            refetch,
            scopeFilter,
            search,
            setSearch,
            setScopeFilter,
        } = useContentList({
            contentType,
            pageSize: 20,
        });

        // Show error notification
        useEffect(() => {
            if (isError && error) {
                notifications.show({
                    autoClose: 5000,
                    color: 'red',
                    message: NOTIFICATIONS.LOAD_ERROR.message,
                    title: NOTIFICATIONS.LOAD_ERROR.title,
                });
            }
        }, [isError, error]);

        // Content click handler
        const handleContentClick = useCallback(
            (content: Content) => {
                onContentClick?.(content);
            },
            [onContentClick],
        );

        // Render content card based on type
        const renderContentItem = useCallback(
            (content: Content) => {
                if (contentType === 'exercise') {
                    return (
                        <ExerciseCard
                            content={content}
                            key={content.id}
                            onClick={() => handleContentClick(content)}
                        />
                    );
                }

                return (
                    <RecipeCard
                        content={content}
                        key={content.id}
                        onClick={() => handleContentClick(content)}
                    />
                );
            },
            [contentType, handleContentClick],
        );

        return (
            <>
                {/* Header Section */}
                <HeadingContainer>
                    <Stack gap="lg">
                        {/* Title and Create Button */}
                        <LibraryHeader
                            createButtonText={config.createTitle}
                            onCreateClick={onCreateClick}
                        />

                        {/* Content Type Filter - Primary navigation */}
                        <ContentTypeFilter
                            onChange={onContentTypeChange}
                            value={contentType}
                        />

                        {/* Search & Filter Group - Related controls */}
                        <Stack gap="sm">
                            <LibrarySearch
                                onChange={setSearch}
                                placeholder={config.searchPlaceholder}
                                value={search}
                            />

                            <ScopeFilterChips
                                onChange={setScopeFilter}
                                value={scopeFilter}
                            />
                        </Stack>
                    </Stack>
                </HeadingContainer>

                <PaddingContainer
                    paddingX={'xs'}
                    paddingY={'lg'}
                >
                    {/* Loading State */}
                    {isLoading && (
                        <LoadingOverlay
                            loaderProps={{type: 'bars'}}
                            visible={isLoading}
                        />
                    )}

                    {/* Error State */}
                    {isError && !isLoading && (
                        <LibraryErrorState
                            contentLabel={config.pluralLabel.toLowerCase()}
                            onRetry={refetch}
                        />
                    )}

                    {/* Empty State */}
                    {!isLoading && !isError && contents.length === 0 && (
                        <LibraryEmptyState
                            description={config.emptyStateDescription}
                            searchQuery={search}
                            title={config.emptyStateTitle}
                        />
                    )}

                    {/* Content List */}
                    {!isLoading && !isError && contents.length > 0 && (
                        <RecordsList<Content>
                            emptyState={null}
                            fetchNextPage={fetchNextPage}
                            gap={0}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            itemKey={(item) => item.id}
                            loadMoreText={`Load more ${config.pluralLabel.toLowerCase()}`}
                            records={contents}
                            renderItem={renderContentItem}
                        />
                    )}
                </PaddingContainer>
            </>
        );
    },
);

ContentListView.displayName = 'ContentListView';
