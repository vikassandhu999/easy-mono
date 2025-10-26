/**
 * Library Header Component
 *
 * Displays the library header with title and create action button.
 * Pure presentational component with no business logic.
 */

import {Button, Group} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {memo} from 'react';

import Header from '@/shared/layouts/Header';

interface LibraryHeaderProps {
    /**
     * Text for create button
     */
    createButtonText: string;

    /**
     * Callback when create button is clicked
     */
    onCreateClick: () => void;
}

/**
 * Library page header with create action
 */
export const LibraryHeader = memo<LibraryHeaderProps>(({createButtonText, onCreateClick}) => {
    return (
        <Header
            actions={
                <Group gap="xs">
                    <Button
                        aria-label={createButtonText}
                        leftSection={<IconPlus size={18} />}
                        onClick={onCreateClick}
                        radius="xl"
                        size="md"
                    >
                        {createButtonText}
                    </Button>
                </Group>
            }
            title="Library"
        />
    );
});

LibraryHeader.displayName = 'LibraryHeader';
