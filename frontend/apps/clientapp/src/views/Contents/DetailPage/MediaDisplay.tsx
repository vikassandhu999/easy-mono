/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';
import {Box, Card, Text, Stack, Group, Image, ActionIcon, Flex} from '@mantine/core';
import {IconVideo, IconPhoto, IconMusic, IconFile, IconLink, IconExternalLink} from '@tabler/icons-react';
import {useViewportSize} from '@mantine/hooks';

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
    height?: number;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({media, fallbackThumbnail}) => {
    const {width} = useViewportSize();

    const maxMediaWidth = Math.min(820, width) - 56;
    const minMediaHeight = Math.floor(maxMediaWidth / (16 / 9));

    // Handle case where media is null or undefined
    if (!media) {
        if (fallbackThumbnail) {
            return (
                <Card
                    p={0}
                    radius="md"
                    style={{
                        overflow: 'hidden',
                        maxWidth: '100%',
                    }}
                >
                    <Image
                        src={fallbackThumbnail}
                        alt="Content thumbnail"
                        height={`${minMediaHeight}px`}
                        width={`${maxMediaWidth}px`}
                        fit="contain"
                        style={{
                            minHeight: '200px',
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        }}
                    />
                </Card>
            );
        }
        return null;
    }

    // Cast media to ContentMedia if it's a generic Record
    const mediaContent = media as ContentMedia;

    // Get appropriate icon for media type
    const getMediaIcon = (type: string) => {
        switch (type) {
            case 'video':
                return IconVideo;
            case 'image':
                return IconPhoto;
            case 'audio':
                return IconMusic;
            case 'document':
            case 'pdf':
                return IconFile;
            case 'url':
                return IconLink;
            default:
                return IconFile;
        }
    };

    const MediaIcon = getMediaIcon(mediaContent.type);

    // Render different media types
    const renderMediaContent = () => {
        switch (mediaContent.type) {
            case 'image':
                return (
                    <Image
                        src={mediaContent.url}
                        alt="Media content"
                        h={`${minMediaHeight}px`}
                        w={`${maxMediaWidth}px`}
                        fit="contain"
                        style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        }}
                        fallbackSrc="https://placehold.co/400x300?text=Image+Not+Found"
                    />
                );
            // @ts-expect-error
            case '':
            case 'video':
                if (mediaContent.source === 'youtube' && mediaContent.external_id) {
                    return (
                        <Box
                            h={`${minMediaHeight}px`}
                            w={`${maxMediaWidth}px`}
                            style={{position: 'relative', aspectRatio: '16/9'}}
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${mediaContent.external_id}`}
                                title="YouTube video"
                                frameBorder="0"
                                allowFullScreen
                                style={{
                                    borderRadius: '8px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                }}
                            />
                        </Box>
                    );
                }

                if (mediaContent.source === 'vimeo' && mediaContent.external_id) {
                    return (
                        <Box
                            h={`${minMediaHeight}px`}
                            w={`${maxMediaWidth}px`}
                            style={{position: 'relative', aspectRatio: '16/9'}}
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://player.vimeo.com/video/${mediaContent.external_id}`}
                                title="Vimeo video"
                                frameBorder="0"
                                allowFullScreen
                                style={{
                                    borderRadius: '8px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                }}
                            />
                        </Box>
                    );
                }

                // Fallback for direct video URLs
                return (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                        height="auto"
                        controls
                        style={{
                            borderRadius: '8px',
                            height: `${minMediaHeight}px`,
                            width: `${maxMediaWidth}px`,
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        }}
                    >
                        <source
                            src={mediaContent.url}
                            type={mediaContent.mime_type || 'video/mp4'}
                        />
                        Your browser does not support the video tag.
                    </video>
                );

            case 'audio':
                return (
                    <Box
                        p="lg"
                        style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            minHeight: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Stack
                            gap="md"
                            align="center"
                            style={{width: '100%', maxWidth: '400px'}}
                        >
                            <MediaIcon
                                size={32}
                                color="var(--mantine-color-blue-6)"
                            />
                            <audio
                                controls
                                style={{width: '100%'}}
                            >
                                <source
                                    src={mediaContent.url}
                                    type={mediaContent.mime_type || 'audio/mpeg'}
                                />
                                Your browser does not support the audio element.
                            </audio>
                        </Stack>
                    </Box>
                );

            case 'document':
            case 'pdf':
            case 'url':
                return (
                    <Box
                        p="lg"
                        style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            minHeight: '100px',
                        }}
                    >
                        <Group
                            gap="md"
                            align="center"
                        >
                            <MediaIcon
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
                                    style={{
                                        wordBreak: 'break-all',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {mediaContent.url}
                                </Text>
                            </Stack>
                            <ActionIcon
                                component="a"
                                href={mediaContent.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="light"
                                size="lg"
                            >
                                <IconExternalLink size={18} />
                            </ActionIcon>
                        </Group>
                    </Box>
                );

            default:
                return (
                    <Box
                        p="lg"
                        style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            minHeight: '120px',
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
                            <MediaIcon
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
        }
    };

    return (
        <Flex
            style={{
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--ce-size-md)',
                margin: 'auto',
            }}
        >
            {renderMediaContent()}
        </Flex>
    );
};

export default MediaDisplay;
