import React from 'react';
import {Text, Stack, TextInput, ActionIcon, Image, Alert} from '@mantine/core';
import {
    IconPhoto,
    IconVideo,
    IconPdf,
    IconMusic,
    IconWorldWww,
    IconFileDescription,
    IconLink,
    IconTrash,
} from '@tabler/icons-react';
import {OptionSelector, OptionItem} from './OptionSelector';

const MEDIA_TYPES: OptionItem[] = [
    {
        value: 'none',
        label: 'Text',
        icon: IconFileDescription,
        description: 'Text-based instructions or content',
        color: 'var(--mantine-color-gray-1)',
    },
    {
        value: 'video',
        label: 'Video',
        icon: IconVideo,
        description: 'YouTube, Vimeo or other video content',
        color: 'var(--mantine-color-red-1)',
    },
    {
        value: 'image',
        label: 'Image',
        icon: IconPhoto,
        description: 'Image-based content or diagram',
        color: 'var(--mantine-color-green-1)',
    },
    {
        value: 'pdf',
        label: 'PDF',
        icon: IconPdf,
        description: 'PDF document with content',
        color: 'var(--mantine-color-orange-1)',
    },
    {
        value: 'audio',
        label: 'Audio',
        icon: IconMusic,
        description: 'Audio track or recording',
        color: 'var(--mantine-color-purple-1)',
    },
    {
        value: 'link',
        label: 'Link',
        icon: IconWorldWww,
        description: 'External resource or website link',
        color: 'var(--mantine-color-blue-1)',
    },
];

interface MediaDetailsProps {
    /** Currently selected content type */
    selectedType: string;
    /** Callback function called when a content type is selected */
    onTypeChange: (type: string) => void;
    /** Media value object */
    mediaValue: any;
    /** Callback for media URL changes */
    onMediaUrlChange: (url: string) => void;
}

export const MediaDetails: React.FC<MediaDetailsProps> = ({
    selectedType,
    onTypeChange,
    mediaValue,
    onMediaUrlChange,
}) => {
    // Media handling logic
    const renderMediaFields = () => {
        if (selectedType === 'none') {
            return (
                <Alert
                    color="blue"
                    variant="light"
                    mt="md"
                    styles={{
                        root: {
                            borderRadius: 8,
                        },
                    }}
                >
                    <Text size="sm">
                        Text-based content will use the instructions you provide below. No additional media files are
                        required.
                    </Text>
                </Alert>
            );
        }

        const mediaUrl = mediaValue?.url || '';
        const mediaPlaceholder =
            {
                video: 'https://www.youtube.com/watch?v=...',
                image: 'https://example.com/image.jpg',
                pdf: 'https://example.com/document.pdf',
                audio: 'https://example.com/audio.mp3',
                link: 'https://example.com',
            }[selectedType] || '';

        const mediaDescription =
            {
                video: 'Enter a YouTube, Vimeo or direct video URL',
                image: 'Enter the URL of an image to display',
                pdf: 'Enter the URL of a PDF document',
                audio: 'Enter the URL of an audio file',
                link: 'Enter the URL of an external resource',
            }[selectedType] || '';

        const selectedTypeData = MEDIA_TYPES.find((t) => t.value === selectedType);

        return (
            <Stack
                gap="md"
                mt="lg"
            >
                <TextInput
                    label={`${selectedTypeData?.label} URL`}
                    placeholder={mediaPlaceholder}
                    description={mediaDescription}
                    leftSection={<IconLink size={16} />}
                    size={'lg'}
                    rightSection={
                        mediaUrl ? (
                            <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => onMediaUrlChange('')}
                                styles={{
                                    root: {
                                        '&:hover': {
                                            backgroundColor: 'var(--mantine-color-red-1)',
                                        },
                                    },
                                }}
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        ) : null
                    }
                    value={mediaUrl}
                    onChange={(e) => onMediaUrlChange(e.currentTarget.value)}
                    styles={{
                        input: {
                            borderRadius: 8,
                        },
                    }}
                />

                {/* Video previews */}
                {selectedType === 'video' && mediaValue?.source === 'youtube' && mediaValue?.external_id && (
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://www.youtube.com/embed/${mediaValue.external_id}`}
                        title="YouTube video"
                        frameBorder="0"
                        allowFullScreen
                        style={{
                            borderRadius: 8,
                            border: '1px solid var(--mantine-color-gray-3)',
                        }}
                    />
                )}

                {selectedType === 'video' && mediaValue?.source === 'vimeo' && mediaValue?.external_id && (
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://player.vimeo.com/video/${mediaValue.external_id}`}
                        title="Vimeo video"
                        frameBorder="0"
                        allowFullScreen
                        style={{
                            borderRadius: 8,
                            border: '1px solid var(--mantine-color-gray-3)',
                        }}
                    />
                )}

                {/* Image preview */}
                {selectedType === 'image' && mediaUrl && (
                    <Image
                        src={mediaUrl}
                        height={200}
                        fit="contain"
                        style={{
                            borderRadius: 8,
                            border: '1px solid var(--mantine-color-gray-3)',
                        }}
                        fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzY5NzA3NyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbnZhbGlkIGltYWdlIFVSTDwvdGV4dD4KPHN2Zz4="
                    />
                )}
            </Stack>
        );
    };

    return (
        <Stack gap={0}>
            <OptionSelector
                value={selectedType}
                onChange={onTypeChange}
                options={MEDIA_TYPES}
                label="Media Type"
                placeholder="Choose the type of content you want to create"
                description="Select the primary format for your content. This determines what media fields will be available."
                columns={3}
            />

            {selectedType && renderMediaFields()}
        </Stack>
    );
};

export {MEDIA_TYPES as CONTENT_TYPES};
