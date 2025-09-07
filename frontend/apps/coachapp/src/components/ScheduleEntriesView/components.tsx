import {Stack, Center, Loader, Text} from '@mantine/core';
import {LOADING_HEIGHT} from './constants';

interface LoadingStateProps {
    message: string;
}

export const LoadingState = ({message}: LoadingStateProps) => (
    <Center h={LOADING_HEIGHT}>
        <Stack
            gap="sm"
            align="center"
        >
            <Loader
                size="md"
                color="blue"
            />
            <Text
                size="sm"
                c="dimmed"
                fw={600}
                ta="center"
            >
                {message}
            </Text>
        </Stack>
    </Center>
);

interface SessionErrorStateProps {
    title: string;
    description: string;
}

export const SessionErrorState = ({title, description}: SessionErrorStateProps) => (
    <Center h={80}>
        <Stack
            gap="xs"
            align="center"
        >
            <Text
                fw={700}
                size="sm"
                c="red.7"
                ta="center"
            >
                {title}
            </Text>
            <Text
                size="xs"
                c="red.6"
                ta="center"
            >
                {description}
            </Text>
        </Stack>
    </Center>
);
