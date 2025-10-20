/**
 * Library Empty State Component
 *
 * Displays appropriate empty state for library content.
 * Shows different messages for search results vs empty library.
 */

import {Flex, Image, Stack, Text, Title} from '@mantine/core';
import {memo} from 'react';

import EmptyLibraryImage from '../../../../../public/empty_plan.png';

interface LibraryEmptyStateProps {
    /**
     * Description text
     */
    description: string;

    /**
     * Current search query
     */
    searchQuery: string;

    /**
     * Title text
     */
    title: string;
}

/**
 * Empty state display for library
 */
export const LibraryEmptyState = memo<LibraryEmptyStateProps>(({description, searchQuery, title}) => {
    const displayTitle = searchQuery ? `No results for "${searchQuery}"` : title;
    const displayDescription = searchQuery ? 'Try different keywords or create new content.' : description;

    return (
        <Flex
            align="center"
            direction="column"
            gap="md"
            justify="center"
            px="md"
        >
            <Image
                alt={searchQuery ? 'No results illustration' : 'Empty library illustration'}
                src={EmptyLibraryImage}
                w={240}
            />
            <Stack
                align="center"
                gap="xs"
            >
                <Title
                    order={3}
                    ta="center"
                >
                    {displayTitle}
                </Title>
                <Text
                    c="dimmed"
                    maw={400}
                    size="md"
                    ta="center"
                >
                    {displayDescription}
                </Text>
            </Stack>
        </Flex>
    );
});

LibraryEmptyState.displayName = 'LibraryEmptyState';
