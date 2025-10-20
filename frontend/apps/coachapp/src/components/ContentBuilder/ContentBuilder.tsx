import {Alert, Button, LoadingOverlay, Stack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {skipToken} from '@reduxjs/toolkit/query';
import {IconAlertCircle, IconRefresh} from '@tabler/icons-react';
import {useCallback, useState} from 'react';

import {
    Content,
    ContentType,
    useCreateContentMutation,
    useGetContentQuery,
    useUpdateContentMutation,
} from '@/store/services/contents';

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

    const {data: content, isLoading: isLoadingContent, isError: isContentError} = contentQuery;

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
                    message: 'Changes saved successfully',
                });
            } catch (error) {
                const message =
                    error instanceof ContentBuildError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : 'Check your input and try again';
                notifications.show({
                    color: 'red',
                    message,
                    title: 'Unable to save content',
                });
            }
        },
        [createContent, currentContentId, onComplete, contentQuery, updateContent],
    );

    if (!currentContentId && !effectiveContentType) {
        return (
            <Alert
                color="red"
                icon={<IconAlertCircle size={20} />}
                title="Missing information"
            >
                Please select a content type to continue.
            </Alert>
        );
    }

    // Show loading or error state when fetching content
    if (currentContentId && (isLoadingContent || isContentError)) {
        return (
            <Stack gap="md">
                {isLoadingContent ? (
                    <LoadingOverlay
                        loaderProps={{
                            type: 'bars',
                        }}
                        visible
                    />
                ) : (
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={20} />}
                        title="Unable to load content"
                    >
                        <Stack gap="sm">
                            We couldn't load this content. Please try again.
                            <Button
                                color="red"
                                leftSection={<IconRefresh size={16} />}
                                onClick={() => contentQuery.refetch()}
                                size="md"
                                variant="light"
                            >
                                Retry
                            </Button>
                        </Stack>
                    </Alert>
                )}
            </Stack>
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
