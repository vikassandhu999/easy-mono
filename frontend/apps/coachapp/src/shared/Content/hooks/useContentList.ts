import {useEffect, useState} from 'react';

import {Content, CONTENT_SCOPE_FILTERS, ContentScopeFilter, ContentType} from '@/services/contents';
import {useListContentsInfiniteQuery} from '@/services/contents';

export interface UseContentListOptions {
    activeOnly?: boolean;
    contentType: ContentType;
    pageSize?: number;
}

/**
 * Hook for fetching and managing content lists with search, filters, and pagination
 */
export function useContentList({contentType, pageSize = 20, activeOnly = false}: UseContentListOptions) {
    const [scopeFilter, setScopeFilter] = useState<ContentScopeFilter>('all');
    const [search, setSearch] = useState('');

    const {data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isError, error} =
        useListContentsInfiniteQuery(
            {
                scope: scopeFilter,
                active_only: activeOnly,
                content_type: contentType,
                page_size: pageSize,
                search: search || undefined,
            },
            {refetchOnMountOrArgChange: true},
        );

    useEffect(() => {
        refetch();
    }, [scopeFilter, refetch]);

    const contents = data?.pages.flatMap((p) => p.records) ?? [];

    return {
        // Data
        contents,
        hasNextPage,
        isLoading,
        isFetchingNextPage,
        isError,
        error,

        // Filters
        scopeFilter,
        scopeFilters: CONTENT_SCOPE_FILTERS,
        search,
        setScopeFilter,
        setSearch,

        // Actions
        fetchNextPage,
        refetch,
    };
}

/**
 * Hook for managing selected content and drawer states
 */
export function useContentSelection<T = Content>() {
    const [selectedContent, setSelectedContent] = useState<null | T>(null);

    const clearSelection = () => setSelectedContent(null);

    return {
        clearSelection,
        selectedContent,
        setSelectedContent,
    };
}
