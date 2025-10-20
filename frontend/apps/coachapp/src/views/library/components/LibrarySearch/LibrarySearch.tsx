/**
 * Library Search Component
 *
 * Search input for filtering library content.
 * Pure presentational component.
 */

import {TextInput} from '@mantine/core';
import {memo} from 'react';

interface LibrarySearchProps {
    /**
     * Callback when search value changes
     */
    onChange: (value: string) => void;

    /**
     * Placeholder text
     */
    placeholder: string;

    /**
     * Current search value
     */
    value: string;
}

/**
 * Search input for library content
 */
export const LibrarySearch = memo<LibrarySearchProps>(({onChange, placeholder, value}) => {
    return (
        <TextInput
            aria-label="Search content"
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder={placeholder}
            radius="xl"
            size="md"
            value={value}
            variant="filled"
        />
    );
});

LibrarySearch.displayName = 'LibrarySearch';
