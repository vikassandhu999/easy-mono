import {Center, Loader, Stack, Text} from '@mantine/core';

import {LOADING_HEIGHT} from './constants';

interface LoadingStateProps {
    message: string;
}

export const LoadingState = ({message}: LoadingStateProps) => (
    <Center h={LOADING_HEIGHT}>
        <Stack
            align="center"
            gap="sm"
        >
            <Loader
                color="blue"
                size="md"
            />
            <Text
                c="dimmed"
                fw={600}
                size="sm"
                ta="center"
            >
                {message}
            </Text>
        </Stack>
    </Center>
);

interface SessionErrorStateProps {
    description: string;
    title: string;
}

export const SessionErrorState = ({description, title}: SessionErrorStateProps) => (
    <Center h={80}>
        <Stack
            align="center"
            gap="xs"
        >
            <Text
                c="red.7"
                fw={700}
                size="sm"
                ta="center"
            >
                {title}
            </Text>
            <Text
                c="red.6"
                size="xs"
                ta="center"
            >
                {description}
            </Text>
        </Stack>
    </Center>
);
