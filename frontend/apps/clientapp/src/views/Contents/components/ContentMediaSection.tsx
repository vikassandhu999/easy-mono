import React from 'react';
import {Card, Stack, Text} from '@mantine/core';
import MediaDisplay from '../DetailPage/MediaDisplay';

interface ContentMediaSectionProps {
    content: {
        name: string;
        thumbnail_url?: string;
        media?: Record<string, any>;
    };
}

export const ContentMediaSection: React.FC<ContentMediaSectionProps> = ({content}) => {
    return (
        <Card withBorder={false}>
            <Stack gap="md">
                <Text
                    fw={500}
                    size="lg"
                >
                    Media
                </Text>

                <MediaDisplay
                    media={content.media}
                    fallbackThumbnail={content.thumbnail_url}
                    height={300}
                />
            </Stack>
        </Card>
    );
};
