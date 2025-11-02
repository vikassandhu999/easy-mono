import {Alert, Button, LoadingOverlay, Stack} from '@mantine/core';
import {IconAlertCircle, IconRefresh} from '@tabler/icons-react';

import {ContentType} from '@/services/contents';

import {ContentCreateForm} from './forms';
import {useContentMutation, useContentState} from './hooks';
import {ContentBuilderProps} from './lib/types';

/**
 * ContentBuilder - Main content creation/editing component
 *
 * Architecture:
 * - Uses custom hooks for state and mutation logic
 * - Delegates form rendering to ContentCreateForm
 * - Supports dual CTA pattern for editing (Save / Save & Close)
 * - Handles loading, error, and success states
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
    const {content, contentId, effectiveContentType, isError, isLoading, refetch, setContentId} = useContentState({
        contentId: initialContentId,
        contentType,
    });

    const {handleSubmit, isSubmitting} = useContentMutation({
        contentId,
        onComplete,
        onSuccess: (created) => {
            // Update local contentId state when content is created
            if (!contentId) {
                setContentId(created.id);
            }
        },
    });

    const fallbackContentType: ContentType = effectiveContentType ?? 'exercise';

    // Missing content type - show error
    if (!contentId && !effectiveContentType) {
        return (
            <Alert
                color="red"
                icon={<IconAlertCircle size={16} />}
                title="Missing information"
            >
                Please select a content type to continue.
            </Alert>
        );
    }

    // Loading state when fetching existing content
    if (contentId && isLoading) {
        return (
            <LoadingOverlay
                loaderProps={{
                    type: 'bars',
                }}
                visible
            />
        );
    }

    // Error state when fetching existing content failed
    if (contentId && isError) {
        return (
            <Alert
                color="red"
                icon={<IconAlertCircle size={16} />}
                title="Unable to load content"
            >
                <Stack gap="sm">
                    We couldn't load this content. Please try again.
                    <Button
                        color="red"
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => refetch()}
                        variant="light"
                    >
                        Retry
                    </Button>
                </Stack>
            </Alert>
        );
    }

    // Render the form
    return (
        <ContentCreateForm
            defaultContentType={fallbackContentType}
            initialContent={content}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            showSaveOptions={showSaveOptions && !!contentId}
        />
    );
}
