import React from 'react';
import {Card, Stack, Text} from '@mantine/core';

interface ContentTextSectionProps {
    title: string;
    content: string;
}

export const ContentTextSection: React.FC<ContentTextSectionProps> = ({title, content}) => {
    return (
        <Card withBorder>
            <Stack gap="md">
                <Text
                    fw={500}
                    size="lg"
                >
                    {title}
                </Text>
                <Text
                    size="sm"
                    style={{whiteSpace: 'pre-wrap'}}
                >
                    {content}
                </Text>
            </Stack>
        </Card>
    );
};
