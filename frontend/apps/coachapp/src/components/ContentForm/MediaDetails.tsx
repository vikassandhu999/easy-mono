import {ActionIcon, Image, Stack, TextInput} from '@mantine/core';
import {IconLink, IconMusic, IconPdf, IconPhoto, IconTrash, IconVideo, IconWorldWww} from '@tabler/icons-react';
import React from 'react';

import {Content} from '@/store/services/contents';
import EasyOptionSelector from '@/components/EasyOptionSelector';
import {OptionItem} from '@/components/EasyOptionSelector/EasyOptionSelector.tsx';

const MEDIA_TYPES: OptionItem[] = [
    {
        color: 'var(--mantine-color-red-1)',
        description: 'YouTube, Vimeo or other video content',
        icon: IconVideo,
        label: 'Video',
        value: 'video',
    },
    {
        color: 'var(--mantine-color-green-1)',
        description: 'Image-based content or diagram',
        icon: IconPhoto,
        label: 'Image',
        value: 'image',
    },
    {
        color: 'var(--mantine-color-orange-1)',
        description: 'PDF document with content',
        icon: IconPdf,
        label: 'PDF',
        value: 'pdf',
    },
    {
        color: 'var(--mantine-color-purple-1)',
        description: 'Audio track or recording',
        icon: IconMusic,
        label: 'Audio',
        value: 'audio',
    },
    {
        color: 'var(--mantine-color-blue-1)',
        description: 'External resource or website link',
        icon: IconWorldWww,
        label: 'Link',
        value: 'link',
    },
];

interface MediaDetailsProps {
    error?: string;
    onChange: (value: Content['media'] | undefined) => void;
    value?: Content['media'];
}

const parseVideoUrl = (url: string) => {
    // YouTube URL parsing
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
        return {external_id: youtubeMatch[1], source: 'youtube', url};
    }

    // Vimeo URL parsing
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return {external_id: vimeoMatch[1], source: 'vimeo', url};
    }

    return {source: 'direct', type: 'video', url};
};

const parseMedia = (mediaType: string, url: string) => {
    if (!url.trim()) {
        return {type: mediaType};
    }

    let mediaData;
    switch (mediaType) {
        case 'audio':
            mediaData = {type: 'audio', url};
            break;
        case 'image':
            mediaData = {type: 'image', url};
            break;
        case 'link':
            mediaData = {type: 'url', url};
            break;
        case 'pdf':
            mediaData = {
                mime_type: 'application/pdf',
                type: 'document',
                url,
            };
            break;
        case 'video':
            mediaData = {...parseVideoUrl(url), type: 'video'};
            break;
        default:
            mediaData = undefined;
    }

    return mediaData;
};

export const MediaDetails: React.FC<MediaDetailsProps> = ({error, onChange, value}) => {
    const selectedType = value?.type ?? 'video';

    const onChangeInternal = (mediaType: string, url: string) => {
        onChange(parseMedia(mediaType, url));
    };

    // Media handling logic
    const renderMediaFields = () => {
        const mediaUrl = value?.url || '';
        const mediaPlaceholder =
            {
                audio: 'https://example.com/audio.mp3',
                image: 'https://example.com/image.jpg',
                link: 'https://example.com',
                pdf: 'https://example.com/document.pdf',
                video: 'https://www.youtube.com/watch?v=...',
            }[selectedType] || '';

        const mediaDescription =
            {
                audio: 'Audio Link',
                image: 'Image Link',
                link: 'External Resource Link',
                pdf: 'PDF Link',
                video: 'Video Link (from YouTube, Vimeo, etc.)',
            }[selectedType] || '';

        return (
            <Stack gap={'xs'}>
                <TextInput
                    description={mediaDescription}
                    error={error}
                    leftSection={<IconLink size={16} />}
                    onChange={(e) => onChangeInternal(selectedType, e.currentTarget.value)}
                    placeholder={mediaPlaceholder}
                    rightSection={
                        mediaUrl ? (
                            <ActionIcon
                                color="red"
                                onClick={() => onChangeInternal(selectedType, '')}
                                styles={{
                                    root: {
                                        '&:hover': {
                                            backgroundColor: 'var(--mantine-color-red-1)',
                                        },
                                    },
                                }}
                                variant="subtle"
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        ) : null
                    }
                    size={'md'}
                    styles={{
                        input: {
                            borderRadius: 8,
                        },
                    }}
                    value={mediaUrl}
                />

                {/* Video previews */}
                {selectedType === 'video' && value?.source === 'youtube' && value?.external_id && (
                    <iframe
                        allowFullScreen
                        height="200"
                        src={`https://www.youtube.com/embed/${value.external_id}`}
                        style={{
                            border: '1px solid var(--mantine-color-gray-3)',
                            borderRadius: 8,
                        }}
                        title="YouTube video"
                        width="100%"
                    />
                )}

                {selectedType === 'video' && value?.source === 'vimeo' && value?.external_id && (
                    <iframe
                        allowFullScreen
                        height="200"
                        src={`https://player.vimeo.com/video/${value.external_id}`}
                        style={{
                            border: '1px solid var(--mantine-color-gray-3)',
                            borderRadius: 8,
                        }}
                        title="Vimeo video"
                        width="100%"
                    />
                )}

                {/* Image preview */}
                {selectedType === 'image' && mediaUrl && (
                    <Image
                        fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzY5NzA3NyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbnZhbGlkIGltYWdlIFVSTDwvdGV4dD4KPHN2Zz4="
                        fit="contain"
                        height={200}
                        src={mediaUrl}
                        style={{
                            border: '1px solid var(--mantine-color-gray-3)',
                            borderRadius: 8,
                        }}
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
            <EasyOptionSelector
                columns={3}
                description="Select media format"
                label="Media"
                onChange={(newType) => onChangeInternal(newType, value?.url || '')}
                options={MEDIA_TYPES}
                placeholder="Choose the type of content you want to create"
                value={selectedType}
            />
            {selectedType && renderMediaFields()}
        </Stack>
    );
};
