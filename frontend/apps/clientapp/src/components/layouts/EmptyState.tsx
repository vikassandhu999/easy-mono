import {Stack, Text, Title} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {ReactNode} from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    iconColor?: string;
    iconSize?: number | string;
}

export const EmptyState = ({title, description, action}: EmptyStateProps) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    return (
        <Stack
            align={'center'}
            gap={'sm'}
            py={'xl'}
        >
            <Title
                c={'dark'}
                order={isMobile ? 5 : 3}
            >
                {title}
            </Title>
            <Text
                size={isMobile ? 'xs' : 'sm'}
                c={'dimmed'}
                ta={'center'}
            >
                {description}
            </Text>
            {action}
        </Stack>
    );
};
