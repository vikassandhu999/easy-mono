/**
 * Scope Filter Chips Component
 *
 * Chip group for filtering content by scope (all/business/global).
 * Pure presentational component.
 */

import {Chip, Group} from '@mantine/core';
import {memo, useMemo} from 'react';

import {CONTENT_SCOPE_FILTERS, ContentScopeFilter} from '@/store/services/contents';

interface ScopeFilterChipsProps {
    /**
     * Callback when scope filter changes
     */
    onChange: (scope: ContentScopeFilter) => void;

    /**
     * Currently selected scope
     */
    value: ContentScopeFilter;
}

/**
 * Get display label for scope filter
 */
function getScopeDisplayLabel(scope: ContentScopeFilter): string {
    return scope === 'business' ? 'Custom' : scope.charAt(0).toUpperCase() + scope.slice(1);
}

/**
 * Chip group for scope filtering
 */
export const ScopeFilterChips = memo<ScopeFilterChipsProps>(({onChange, value}) => {
    const chips = useMemo(
        () =>
            CONTENT_SCOPE_FILTERS.map((filter) => ({
                displayLabel: getScopeDisplayLabel(filter),
                value: filter,
            })),
        [],
    );

    return (
        <Chip.Group
            onChange={(newValue) => onChange(newValue as ContentScopeFilter)}
            value={value}
        >
            <Group
                gap="xs"
                justify="left"
            >
                {chips.map((chip) => (
                    <Chip
                        key={`scope-filter-${chip.value}`}
                        radius="xl"
                        size="lg"
                        style={{textTransform: 'capitalize'}}
                        value={chip.value}
                        variant="outline"
                    >
                        {chip.displayLabel}
                    </Chip>
                ))}
            </Group>
        </Chip.Group>
    );
});

ScopeFilterChips.displayName = 'ScopeFilterChips';
