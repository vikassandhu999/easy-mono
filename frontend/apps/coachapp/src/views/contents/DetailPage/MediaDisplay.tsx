/* eslint-disable jsx-a11y/media-has-caption */
import {ActionIcon, Box, Card, Flex, Group, Image, Stack, Text} from '@mantine/core';
import {Icon, IconExternalLink, IconFile, IconLink, IconMusic, IconPhoto, IconVideo} from '@tabler/icons-react';
import React, {CSSProperties} from 'react';

export interface ContentMedia {
    external_id?: string;
    mime_type?: string;
    source: 'url' | 'vimeo' | 'youtube';
    type: 'audio' | 'document' | 'image' | 'pdf' | 'url' | 'video';
    url: string;
}

interface MediaDisplayProps {
    /** Optional override aspect ratio (defaults to 16/9) */
    aspectRatio?: string; // e.g. '16/9', '4/3'
    fallbackThumbnail?: string;
    /** Optional fixed max width (defaults to 800) */
    maxWidth?: number;
    media: ContentMedia | null | Record<string, any>;
}

// ---------------------------------
// Helpers / constants
// ---------------------------------
const MEDIA_ICONS: Record<string, Icon> = {
    audio: IconMusic,
    document: IconFile,
    image: IconPhoto,
    pdf: IconFile,
    url: IconLink,
    video: IconVideo,
};

const getMediaIcon = (type: string) => MEDIA_ICONS[type] || IconFile;

const extractFileName = (url: string) => {
    try {
        const last = url.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
        return last || 'media';
    } catch {
        return 'media';
    }
};

// ---------------------------------
// Per-type sub components
// ---------------------------------
interface CommonProps {
    aspectRatio: string;
    maxWidth: number;
    media: ContentMedia;
}

const ImageMedia: React.FC<CommonProps> = ({maxWidth, media}) => (
    <Image
        alt={extractFileName(media.url)}
        fallbackSrc="https://placehold.co/400x300?text=Image+Not+Found"
        fit="contain"
        src={media.url}
        style={{backgroundColor: 'var(--mantine-color-gray-0)', maxWidth}}
    />
);

const VideoMedia: React.FC<CommonProps> = ({aspectRatio, maxWidth, media}) => {
    const ratioStyle: CSSProperties = {aspectRatio, maxWidth, width: '100%'};

    // YouTube
    if (media.source === 'youtube' && media.external_id) {
        return (
            <Box style={{position: 'relative', ...ratioStyle}}>
                <iframe
                    allowFullScreen
                    src={`https://www.youtube.com/embed/${media.external_id}`}
                    style={{border: 0, borderRadius: 8, height: '100%', inset: 0, position: 'absolute', width: '100%'}}
                    title="YouTube video"
                />
            </Box>
        );
    }
    // Vimeo
    if (media.source === 'vimeo' && media.external_id) {
        return (
            <Box style={{position: 'relative', ...ratioStyle}}>
                <iframe
                    allowFullScreen
                    src={`https://player.vimeo.com/video/${media.external_id}`}
                    style={{border: 0, borderRadius: 8, height: '100%', inset: 0, position: 'absolute', width: '100%'}}
                    title="Vimeo video"
                />
            </Box>
        );
    }
    // Direct video URL fallback
    return (
        <Box style={ratioStyle}>
            <video
                controls
                style={{backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 8, height: '100%', width: '100%'}}
            >
                <source
                    src={media.url}
                    type={media.mime_type || 'video/mp4'}
                />
                Your browser does not support the video tag.
            </video>
        </Box>
    );
};

const AudioMedia: React.FC<CommonProps> = ({media}) => {
    const Icon = getMediaIcon(media.type);
    return (
        <Box
            p="lg"
            style={{
                alignItems: 'center',
                backgroundColor: 'var(--mantine-color-gray-0)',
                display: 'flex',
                justifyContent: 'center',
                minHeight: 120,
            }}
        >
            <Stack
                align="center"
                gap="md"
                style={{maxWidth: 400, width: '100%'}}
            >
                <Icon
                    color="var(--mantine-color-blue-6)"
                    size={32}
                />
                <audio
                    controls
                    style={{width: '100%'}}
                >
                    <source
                        src={media.url}
                        type={media.mime_type || 'audio/mpeg'}
                    />
                    Your browser does not support the audio element.
                </audio>
            </Stack>
        </Box>
    );
};

const DocumentLikeMedia: React.FC<CommonProps> = ({media}) => {
    const Icon = getMediaIcon(media.type);
    return (
        <Box
            p="lg"
            style={{backgroundColor: 'var(--mantine-color-gray-0)', minHeight: 100}}
        >
            <Group
                align="center"
                gap="md"
            >
                <Icon
                    color="var(--mantine-color-blue-6)"
                    size={28}
                />
                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={500}
                        size="sm"
                    >
                        Document
                    </Text>
                    <Text
                        c="dimmed"
                        size="xs"
                        style={{lineHeight: 1.4, wordBreak: 'break-all'}}
                    >
                        {media.url}
                    </Text>
                </Stack>
                <ActionIcon
                    aria-label="Open document in new tab"
                    component="a"
                    href={media.url}
                    rel="noopener noreferrer"
                    size="lg"
                    target="_blank"
                    variant="light"
                >
                    <IconExternalLink size={18} />
                </ActionIcon>
            </Group>
        </Box>
    );
};

const UnsupportedMedia: React.FC<{media: ContentMedia}> = ({media}) => {
    const Icon = getMediaIcon(media.type);
    return (
        <Box
            p="lg"
            style={{
                alignItems: 'center',
                backgroundColor: 'var(--mantine-color-gray-0)',
                display: 'flex',
                justifyContent: 'center',
                minHeight: 120,
            }}
            ta="center"
        >
            <Stack
                align="center"
                gap="md"
            >
                <Icon
                    color="var(--mantine-color-gray-6)"
                    size={32}
                />
                <Text
                    c="dimmed"
                    size="sm"
                >
                    Unsupported media type
                </Text>
            </Stack>
        </Box>
    );
};

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
    aspectRatio = '16/9',
    fallbackThumbnail,
    maxWidth = 800,
    media,
}) => {
    const sharedStyles: CSSProperties = {maxWidth};

    // Handle case where media is null or undefined
    if (!media) {
        if (!fallbackThumbnail) return null;
        return (
            <Card
                p={0}
                radius="md"
                style={{maxWidth: '100%', overflow: 'hidden'}}
            >
                <Image
                    alt="Content thumbnail"
                    fallbackSrc="https://placehold.co/400x300?text=Not+Found"
                    fit="contain"
                    src={fallbackThumbnail}
                    style={{backgroundColor: 'var(--mantine-color-gray-0)', ...sharedStyles}}
                />
            </Card>
        );
    }

    const mediaContent = media as ContentMedia; // Accept original loose typing

    let node: React.ReactNode;
    switch (mediaContent.type) {
        case 'audio':
            node = (
                <AudioMedia
                    aspectRatio={aspectRatio}
                    maxWidth={maxWidth}
                    media={mediaContent}
                />
            );
            break;
        case 'document':
        case 'pdf':
        case 'url':
            node = (
                <DocumentLikeMedia
                    aspectRatio={aspectRatio}
                    maxWidth={maxWidth}
                    media={mediaContent}
                />
            );
            break;
        case 'image':
            node = (
                <ImageMedia
                    aspectRatio={aspectRatio}
                    maxWidth={maxWidth}
                    media={mediaContent}
                />
            );
            break;
        case 'video':
            node = (
                <VideoMedia
                    aspectRatio={aspectRatio}
                    maxWidth={maxWidth}
                    media={mediaContent}
                />
            );
            break;
        default:
            node = <UnsupportedMedia media={mediaContent} />;
    }

    return (
        <Flex
            style={{
                alignItems: 'center',
                borderRadius: 'var(--ce-size-md)',
                boxShadow: 'var(--shadow-lg)',
                justifyContent: 'center',
                margin: 'auto',
                overflow: 'hidden',
                width: '100%',
            }}
        >
            {node}
        </Flex>
    );
};

export default MediaDisplay;
