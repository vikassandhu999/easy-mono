/**
 * Library Error State Component
 *
 * Displays error state with retry action.
 * Pure presentational component.
 */

import {Alert, Button, Stack, Text} from '@mantine/core';
import {IconAlertCircle, IconRefresh} from '@tabler/icons-react';
import {memo} from 'react';

import PaddingContainer from '@/shared/containers/PaddingContainer';

interface LibraryErrorStateProps {
    /**
     * Content type label for error message
     */
    contentLabel: string;

    /**
     * Callback when retry is clicked
     */
    onRetry: () => void;
}

/**
 * Error state display with retry action
 */
export const LibraryErrorState = memo<LibraryErrorStateProps>(({contentLabel, onRetry}) => {
    return (
        <PaddingContainer>
            <Alert
                color="red"
                icon={<IconAlertCircle size={20} />}
                title="Error loading content"
                variant="light"
            >
                <Stack gap="sm">
                    <Text size="md">We couldn't load your {contentLabel}. This might be a temporary issue.</Text>
                    <Button
                        color="red"
                        fullWidth
                        leftSection={<IconRefresh size={18} />}
                        onClick={onRetry}
                        radius="xl"
                        size="md"
                        variant="light"
                    >
                        Try again
                    </Button>
                </Stack>
            </Alert>
        </PaddingContainer>
    );
});

LibraryErrorState.displayName = 'LibraryErrorState';
