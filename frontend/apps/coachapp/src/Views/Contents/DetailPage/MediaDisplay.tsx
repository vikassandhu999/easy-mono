/* eslint-disable jsx-a11y/media-has-caption */
import React, {CSSProperties} from 'react';
import {Box, Card, Text, Stack, Group, Image, ActionIcon, Flex} from '@mantine/core';
import {IconVideo, IconPhoto, IconMusic, IconFile, IconLink, IconExternalLink, Icon} from '@tabler/icons-react';

export interface ContentMedia {
    type: 'video' | 'image' | 'audio' | 'document' | 'pdf' | 'url';
    source: 'url' | 'youtube' | 'vimeo';
    url: string;
    external_id?: string;
    mime_type?: string;
}

interface MediaDisplayProps {
    media: ContentMedia | Record<string, any> | null;
    fallbackThumbnail?: string;
    /** Optional fixed max width (defaults to 800) */
    maxWidth?: number;
    /** Optional override aspect ratio (defaults to 16/9) */
    aspectRatio?: string; // e.g. '16/9', '4/3'
}

// ---------------------------------
// Helpers / constants
// ---------------------------------
const MEDIA_ICONS: Record<string, Icon> = {
    video: IconVideo,
    image: IconPhoto,
    audio: IconMusic,
    document: IconFile,
    pdf: IconFile,
    url: IconLink,
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
    media: ContentMedia;
    maxWidth: number;
    aspectRatio: string;
}

const ImageMedia: React.FC<CommonProps> = ({media, maxWidth}) => (
    <Image
        src={media.url}
        alt={extractFileName(media.url)}
        fit="contain"
        style={{backgroundColor: 'var(--mantine-color-gray-0)', maxWidth}}
        fallbackSrc="https://placehold.co/400x300?text=Image+Not+Found"
    />
);

const VideoMedia: React.FC<CommonProps> = ({media, maxWidth, aspectRatio}) => {
    const ratioStyle: CSSProperties = {aspectRatio, width: '100%', maxWidth};

    // YouTube
    if (media.source === 'youtube' && media.external_id) {
        return (
            <Box style={{position: 'relative', ...ratioStyle}}>
                <iframe
                    src={`https://www.youtube.com/embed/${media.external_id}`}
                    title="YouTube video"
                    allowFullScreen
                    style={{position: 'absolute', inset: 0, border: 0, borderRadius: 8, width: '100%', height: '100%'}}
                />
            </Box>
        );
    }
    // Vimeo
    if (media.source === 'vimeo' && media.external_id) {
        return (
            <Box style={{position: 'relative', ...ratioStyle}}>
                <iframe
                    src={`https://player.vimeo.com/video/${media.external_id}`}
                    title="Vimeo video"
                    allowFullScreen
                    style={{position: 'absolute', inset: 0, border: 0, borderRadius: 8, width: '100%', height: '100%'}}
                />
            </Box>
        );
    }
    // Direct video URL fallback
    return (
        <Box style={ratioStyle}>
            <video
                controls
                style={{borderRadius: 8, backgroundColor: 'var(--mantine-color-gray-0)', width: '100%', height: '100%'}}
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
                backgroundColor: 'var(--mantine-color-gray-0)',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Stack
                gap="md"
                align="center"
                style={{width: '100%', maxWidth: 400}}
            >
                <Icon
                    size={32}
                    color="var(--mantine-color-blue-6)"
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
                gap="md"
                align="center"
            >
                <Icon
                    size={28}
                    color="var(--mantine-color-blue-6)"
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
                        size="xs"
                        c="dimmed"
                        style={{wordBreak: 'break-all', lineHeight: 1.4}}
                    >
                        {media.url}
                    </Text>
                </Stack>
                <ActionIcon
                    component="a"
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    size="lg"
                    aria-label="Open document in new tab"
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
                backgroundColor: 'var(--mantine-color-gray-0)',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            ta="center"
        >
            <Stack
                gap="md"
                align="center"
            >
                <Icon
                    size={32}
                    color="var(--mantine-color-gray-6)"
                />
                <Text
                    size="sm"
                    c="dimmed"
                >
                    Unsupported media type
                </Text>
            </Stack>
        </Box>
    );
};

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
    media,
    fallbackThumbnail,
    maxWidth = 800,
    aspectRatio = '16/9',
}) => {
    const sharedStyles: CSSProperties = {maxWidth};

    // Handle case where media is null or undefined
    if (!media) {
        if (!fallbackThumbnail) return null;
        return (
            <Card
                p={0}
                radius="md"
                style={{overflow: 'hidden', maxWidth: '100%'}}
            >
                <Image
                    src={fallbackThumbnail}
                    alt="Content thumbnail"
                    fit="contain"
                    style={{backgroundColor: 'var(--mantine-color-gray-0)', ...sharedStyles}}
                    fallbackSrc="https://placehold.co/400x300?text=Not+Found"
                />
            </Card>
        );
    }

    const mediaContent = media as ContentMedia; // Accept original loose typing

    let node: React.ReactNode;
    switch (mediaContent.type) {
        case 'image':
            node = (
                <ImageMedia
                    media={mediaContent}
                    maxWidth={maxWidth}
                    aspectRatio={aspectRatio}
                />
            );
            break;
        case 'video':
            node = (
                <VideoMedia
                    media={mediaContent}
                    maxWidth={maxWidth}
                    aspectRatio={aspectRatio}
                />
            );
            break;
        case 'audio':
            node = (
                <AudioMedia
                    media={mediaContent}
                    maxWidth={maxWidth}
                    aspectRatio={aspectRatio}
                />
            );
            break;
        case 'document':
        case 'pdf':
        case 'url':
            node = (
                <DocumentLikeMedia
                    media={mediaContent}
                    maxWidth={maxWidth}
                    aspectRatio={aspectRatio}
                />
            );
            break;
        default:
            node = <UnsupportedMedia media={mediaContent} />;
    }

    return (
        <Flex
            style={{
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--ce-size-md)',
                margin: 'auto',
                width: '100%',
            }}
        >
            {node}
        </Flex>
    );
};

export default MediaDisplay;
