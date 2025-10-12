import {Alert} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {skipToken} from '@reduxjs/toolkit/query';
import {useCallback, useState} from 'react';

import {Content, ContentType} from '@/api/contents';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useCreateContentMutation, useGetContentQuery, useUpdateContentMutation} from '@/store/services/contentsApi';

import ContentCreateForm from './ContentCreateForm';
import {buildContentPayload, ContentBuildError, ContentFormValues} from './contentForm';

interface ContentBuilderProps {
    contentId?: string;
    contentType?: ContentType;
    onComplete?: (content: Content, action?: 'close' | 'continue') => void;
    showSaveOptions?: boolean; // Whether to show "Save & Close" and "Save" buttons
}

/**
 * ContentBuilder - Main content creation/editing component
 *
 * Follows SessionBuilder pattern:
 * - Manages content state and API calls
 * - Renders ContentCreateForm with appropriate form based on content type
 * - Supports dual CTA pattern for editing (Save / Save & Close)
 * - Handles create and update mutations
 *
 * Usage:
 * - Create: <ContentBuilder contentType="exercise" onComplete={handleComplete} />
 * - Edit: <ContentBuilder contentId="123" onComplete={handleComplete} showSaveOptions />
 */
export default function ContentBuilder({
    contentId: initialContentId,
    contentType,
    onComplete,
    showSaveOptions = false,
}: ContentBuilderProps) {
    const [currentContentId, setCurrentContentId] = useState<null | string>(initialContentId ?? null);

    const contentQuery = useGetContentQuery(currentContentId ?? skipToken);

    const {data: content} = contentQuery;

    const [createContent, {isLoading: isCreatingContent}] = useCreateContentMutation();
    const [updateContent, {isLoading: isUpdatingContent}] = useUpdateContentMutation();

    const effectiveContentType = content?.type ?? contentType;
    const fallbackContentType: ContentType = effectiveContentType ?? 'exercise';

    const handleFormSubmit = useCallback(
        async (values: ContentFormValues, action: 'close' | 'continue' = 'close') => {
            try {
                const payload = buildContentPayload(values);

                if (!currentContentId) {
                    // Create new content
                    const created = await createContent(payload).unwrap();
                    setCurrentContentId(created.id);
                    onComplete?.(created, action);

                    notifications.show({
                        autoClose: 2000,
                        color: 'green',
                        message: `${values.name} is ready to use`,
                        title: `${values.type.charAt(0).toUpperCase() + values.type.slice(1)} created`,
                    });
                    return;
                }

                // Update existing content
                const updated = await updateContent({
                    data: payload,
                    id: currentContentId,
                }).unwrap();
                onComplete?.(updated, action);
                contentQuery.refetch();

                notifications.show({
                    autoClose: 2000,
                    color: 'green',
                    message: 'Changes saved',
                });
            } catch (error) {
                const message =
                    error instanceof ContentBuildError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : 'Please check your input and try again';
                notifications.show({
                    color: 'red',
                    message,
                    title: 'Could not save',
                });
            }
        },
        [createContent, currentContentId, onComplete, contentQuery, updateContent],
    );

    if (!currentContentId && !effectiveContentType) {
        return (
            <PagePaper>
                <PaddingContainer
                    paddingX="sm"
                    paddingY="lg"
                >
                    <Alert
                        color="red"
                        title="Missing information"
                    >
                        Please select a content type to continue.
                    </Alert>
                </PaddingContainer>
            </PagePaper>
        );
    }

    return (
        <ContentCreateForm
            defaultContentType={fallbackContentType}
            initialContent={content}
            isSubmitting={isCreatingContent || isUpdatingContent}
            onSubmit={handleFormSubmit}
            showSaveOptions={showSaveOptions && !!currentContentId} // Only show options when editing
        />
    );
}
