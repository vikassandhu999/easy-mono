import {useEffect, useState} from 'react';

import {ACCESS_LEVEL_FILTERS, AccessLevelFilter, Content, ContentType} from '@/api/contents';
import {useListContentsInfiniteQuery} from '@/store/services/contentsApi';

interface UseContentListOptions {
    activeOnly?: boolean;
    contentType: ContentType;
    pageSize?: number;
}

/**
 * Hook for fetching and managing content lists with search, filters, and pagination
 */
export function useContentList({contentType, pageSize = 20, activeOnly = false}: UseContentListOptions) {
    const [accessLevelFilter, setAccessLevelFilter] = useState<AccessLevelFilter>('all');
    const [search, setSearch] = useState('');

    const {data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch} = useListContentsInfiniteQuery(
        {
            access_level: accessLevelFilter,
            active_only: activeOnly,
            content_type: contentType,
            page_size: pageSize,
            search: search || undefined,
        },
        {refetchOnMountOrArgChange: true},
    );

    useEffect(() => {
        refetch();
    }, [accessLevelFilter, refetch]);

    const contents = data?.pages.flatMap((p) => p.records) ?? [];

    return {
        // Data
        contents,
        hasNextPage,
        isLoading,
        isFetchingNextPage,

        // Filters
        accessLevelFilter,
        accessLevelFilters: ACCESS_LEVEL_FILTERS,
        search,
        setAccessLevelFilter,
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
