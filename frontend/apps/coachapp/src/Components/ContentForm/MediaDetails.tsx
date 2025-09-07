import React from 'react';
import {Text, Stack, TextInput, ActionIcon, Image, Alert} from '@mantine/core';
import {IconPhoto, IconVideo, IconPdf, IconMusic, IconWorldWww, IconLink, IconTrash} from '@tabler/icons-react';
import {OptionSelector, OptionItem} from '../OptionSelector/OptionSelector';
import {Content} from '@/Api/Contents';

const MEDIA_TYPES: OptionItem[] = [
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
    onChange: (value: Content['media'] | undefined) => void;
    value?: Content['media'];
    error?: string;
}

const parseVideoUrl = (url: string) => {
    // YouTube URL parsing
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
        return {source: 'youtube', external_id: youtubeMatch[1], url};
    }

    // Vimeo URL parsing
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return {source: 'vimeo', external_id: vimeoMatch[1], url};
    }

    return {source: 'direct', url, type: 'video'};
};

const parseMedia = (mediaType: string, url: string) => {
    if (!url.trim()) {
        return {type: mediaType};
    }

    let mediaData;
    switch (mediaType) {
        case 'video':
            mediaData = {...parseVideoUrl(url), type: 'video'};
            break;
        case 'image':
            mediaData = {type: 'image', url};
            break;
        case 'pdf':
            mediaData = {
                type: 'document',
                url,
                mime_type: 'application/pdf',
            };
            break;
        case 'audio':
            mediaData = {type: 'audio', url};
            break;
        case 'link':
            mediaData = {type: 'url', url};
            break;
        default:
            mediaData = undefined;
    }

    return mediaData;
};

export const MediaDetails: React.FC<MediaDetailsProps> = ({value, error, onChange}) => {
    const selectedType = value?.type || 'video';

    const onChangeInternal = (mediaType: string, url: string) => {
        onChange(parseMedia(mediaType, url));
    };

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

        const mediaUrl = value?.url || '';
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
                video: 'Video Link (from YouTube, Vimeo, etc.)',
                image: 'Image Link',
                pdf: 'PDF Link',
                audio: 'Audio Link',
                link: 'External Resource Link',
            }[selectedType] || '';

        return (
            <Stack gap={'xs'}>
                <TextInput
                    placeholder={mediaPlaceholder}
                    description={mediaDescription}
                    leftSection={<IconLink size={16} />}
                    error={error}
                    size={'md'}
                    rightSection={
                        mediaUrl ? (
                            <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => onChangeInternal(selectedType, '')}
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
                    onChange={(e) => onChangeInternal(selectedType, e.currentTarget.value)}
                    styles={{
                        input: {
                            borderRadius: 8,
                        },
                    }}
                />

                {/* Video previews */}
                {selectedType === 'video' && value?.source === 'youtube' && value?.external_id && (
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://www.youtube.com/embed/${value.external_id}`}
                        title="YouTube video"
                        frameBorder="0"
                        allowFullScreen
                        style={{
                            borderRadius: 8,
                            border: '1px solid var(--mantine-color-gray-3)',
                        }}
                    />
                )}

                {selectedType === 'video' && value?.source === 'vimeo' && value?.external_id && (
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://player.vimeo.com/video/${value.external_id}`}
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
        <Stack
            gap={0}
            mb={'sm'}
        >
            <OptionSelector
                value={selectedType}
                onChange={(newType) => onChangeInternal(newType, value?.url || '')}
                options={MEDIA_TYPES}
                label="Media"
                placeholder="Choose the type of content you want to create"
                description="Select media format"
                columns={3}
            />
            {selectedType && renderMediaFields()}
        </Stack>
    );
};

export {MEDIA_TYPES as CONTENT_TYPES};
