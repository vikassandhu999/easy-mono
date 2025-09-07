/**
 * Custom hook for managing content form state and media handling
 */
import {useState, useCallback} from 'react';
import {UseFormReturnType} from '@mantine/form';
import {CreateContentProps, UpdateContentProps} from '@/Api/Contents';
import {modals} from '@mantine/modals';

interface UseContentFormStateProps {
    form: UseFormReturnType<CreateContentProps | UpdateContentProps>;
}

export const useContentFormState = ({form}: UseContentFormStateProps) => {
    const [contentType, setContentType] = useState<string>('none');

    // Separated logic for actually performing the content type change
    const performContentTypeChange = useCallback(
        (type: string) => {
            setContentType(type);

            // Update media object based on content type
            const mediaObject: Record<string, any> | null =
                type === 'none'
                    ? null
                    : {
                          type: type === 'pdf' ? 'document' : type === 'link' ? 'url' : type,
                          source: 'url',
                          url: '',
                      };

            form.setFieldValue('media', mediaObject);
        },
        [form],
    );

    // Handle content type change with confirmation for existing media
    const handleContentTypeChange = useCallback(
        (type: string) => {
            // Check if there's existing media data that would be lost
            const currentMedia = form.values.media;
            const hasExistingMedia = currentMedia && currentMedia.url && currentMedia.url.trim().length > 0;

            if (hasExistingMedia && type !== contentType) {
                // Show confirmation modal
                modals.openConfirmModal({
                    title: 'Change Content Type?',
                    children: `You have existing media content (${currentMedia.url}). Changing the content type will remove this media link. Are you sure you want to continue?`,
                    labels: {
                        confirm: 'Yes, change type',
                        cancel: 'Keep current type',
                    },
                    confirmProps: {
                        color: 'yellow',
                        variant: 'outline',
                    },
                    cancelProps: {
                        variant: 'light',
                    },
                    onConfirm: () => {
                        // Proceed with the change
                        performContentTypeChange(type);
                    },
                    // onCancel is implicit - modal just closes
                });
            } else {
                // No existing media, proceed directly
                performContentTypeChange(type);
            }
        },
        [form, contentType, performContentTypeChange],
    );

    // Handle media URL change with auto-detection for video platforms
    const handleMediaUrlChange = useCallback(
        (url: string) => {
            const currentMedia = form.values.media || {
                type: contentType === 'pdf' ? 'document' : contentType === 'link' ? 'url' : contentType,
                source: 'url',
                url: '',
            };

            let updatedMedia: Record<string, any> = {...currentMedia, url};

            // Auto-detect YouTube or Vimeo links
            if (contentType === 'video') {
                const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

                if (youtubeMatch) {
                    updatedMedia = {
                        ...updatedMedia,
                        source: 'youtube',
                        external_id: youtubeMatch[1],
                    };
                } else if (vimeoMatch) {
                    updatedMedia = {
                        ...updatedMedia,
                        source: 'vimeo',
                        external_id: vimeoMatch[1],
                    };
                } else {
                    updatedMedia = {
                        ...updatedMedia,
                        source: 'url',
                    };
                }
            }

            if (contentType === 'pdf') {
                updatedMedia = {
                    ...updatedMedia,
                    type: 'document',
                    mime_type: 'application/pdf',
                };
            }

            form.setFieldValue('media', updatedMedia);
        },
        [contentType, form],
    );

    return {
        contentType,
        setContentType,
        handleContentTypeChange,
        handleMediaUrlChange,
    };
};
