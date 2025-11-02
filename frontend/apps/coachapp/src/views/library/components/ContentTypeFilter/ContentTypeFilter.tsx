/**
 * Content Type Filter Component
 *
 * Segmented control for switching between content types (exercise/recipe).
 * Pure presentational component.
 */

import {Group, ScrollArea, SegmentedControl} from '@mantine/core';
import {memo, useMemo} from 'react';

import {ContentType} from '@/services/contents';

import {CONTENT_TYPE_UI_CONFIG, VISIBLE_CONTENT_TYPES} from '../../constants';

interface ContentTypeFilterProps {
    /**
     * Callback when content type changes
     */
    onChange: (type: ContentType) => void;

    /**
     * Currently selected content type
     */
    value: ContentType;
}

/**
 * Segmented control for filtering library by content type
 */
export const ContentTypeFilter = memo<ContentTypeFilterProps>(({onChange, value}) => {
    const filterData = useMemo(
        () =>
            VISIBLE_CONTENT_TYPES.map((type) => {
                const config = CONTENT_TYPE_UI_CONFIG[type];
                const Icon = config.icon;

                return {
                    label: (
                        <Group
                            gap="xs"
                            wrap="nowrap"
                        >
                            <Icon
                                size={18}
                                stroke={1.5}
                            />
                            <span>{config.pluralLabel}</span>
                        </Group>
                    ),
                    value: config.value,
                };
            }),
        [],
    );

    return (
        <ScrollArea
            scrollbars="x"
            type="never"
            w="100%"
        >
            <SegmentedControl
                aria-label="Filter library by content type"
                data={filterData}
                fullWidth
                onChange={(newValue) => onChange(newValue as ContentType)}
                radius="xl"
                size="lg"
                value={value}
            />
        </ScrollArea>
    );
});

ContentTypeFilter.displayName = 'ContentTypeFilter';
