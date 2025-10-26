import {notifications} from '@mantine/notifications';
import {useCallback} from 'react';

import {Content, useCreateContentMutation, useUpdateContentMutation} from '@/store/services/contents';

import {buildContentPayload, ContentBuildError, ContentFormValues, FormSubmitAction} from '../lib';

/**
 * Custom hook for handling content creation and updates
 *
 * Centralizes mutation logic and notification handling.
 * Returns a single submit function that handles both create and update.
 */

export interface UseContentMutationOptions {
    contentId?: null | string;
    onComplete?: (content: Content, action?: FormSubmitAction) => void;
    onSuccess?: (content: Content) => void;
}

export interface UseContentMutationReturn {
    handleSubmit: (values: ContentFormValues, action?: FormSubmitAction) => Promise<void>;
    isSubmitting: boolean;
}

export function useContentMutation({
    contentId,
    onComplete,
    onSuccess,
}: UseContentMutationOptions): UseContentMutationReturn {
    const [createContent, {isLoading: isCreating}] = useCreateContentMutation();
    const [updateContent, {isLoading: isUpdating}] = useUpdateContentMutation();

    const handleSubmit = useCallback(
        async (values: ContentFormValues, action: FormSubmitAction = 'close') => {
            try {
                const payload = buildContentPayload(values);

                if (!contentId) {
                    // Create new content
                    const created = await createContent(payload).unwrap();
                    onSuccess?.(created);
                    onComplete?.(created, action);

                    notifications.show({
                        autoClose: 2000,
                        color: 'green',
                        message: `${values.name} is ready to use`,
                        title: `${values.type.charAt(0).toUpperCase() + values.type.slice(1)} created`,
                    });
                } else {
                    // Update existing content
                    const updated = await updateContent({
                        data: payload,
                        id: contentId,
                    }).unwrap();
                    onSuccess?.(updated);
                    onComplete?.(updated, action);

                    notifications.show({
                        autoClose: 2000,
                        color: 'green',
                        message: 'Changes saved successfully',
                    });
                }
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
                throw error;
            }
        },
        [contentId, createContent, updateContent, onComplete, onSuccess],
    );

    return {
        handleSubmit,
        isSubmitting: isCreating || isUpdating,
    };
}
