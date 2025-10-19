import {Stack, Text, Title} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {ReactNode} from 'react';

interface EmptyStateProps {
    action?: ReactNode;
    description: string;
    icon?: ReactNode;
    iconColor?: string;
    iconSize?: number | string;
    title: string;
}

export const EmptyState = ({action, description, title}: EmptyStateProps) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    return (
        <Stack
            align={'center'}
            gap={'sm'}
            py={'xl'}
        >
            <Title
                c={'dark'}
                order={isMobile ? 6 : 4}
            >
                {title}
            </Title>
            <Text
                c={'dimmed'}
                size={isMobile ? 'xs' : 'sm'}
                ta={'center'}
            >
                {description}
            </Text>
            {action}
        </Stack>
    );
};
