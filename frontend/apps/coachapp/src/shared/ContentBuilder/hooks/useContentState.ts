import {skipToken} from '@reduxjs/toolkit/query';
import {useState} from 'react';

import {Content, ContentType, useGetContentQuery} from '@/store/services/contents';

/**
 * Custom hook for managing content state
 *
 * Handles content ID state and fetching content data.
 * Provides loading and error states for UI rendering.
 */

export interface UseContentStateOptions {
    contentId?: string;
    contentType?: ContentType;
}

export interface UseContentStateReturn {
    content?: Content;
    contentId: null | string;
    effectiveContentType?: ContentType;
    isError: boolean;
    isLoading: boolean;
    refetch: () => void;
    setContentId: (id: null | string) => void;
}

export function useContentState({
    contentId: initialContentId,
    contentType,
}: UseContentStateOptions): UseContentStateReturn {
    const [contentId, setContentId] = useState<null | string>(initialContentId ?? null);

    const contentQuery = useGetContentQuery(contentId ?? skipToken);
    const {data: content, isLoading, isError} = contentQuery;

    const effectiveContentType = content?.type ?? contentType;

    return {
        content,
        contentId,
        effectiveContentType,
        isError,
        isLoading,
        refetch: contentQuery.refetch,
        setContentId,
    };
}
