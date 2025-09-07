import React, {useMemo} from 'react';
import {Stack, Group, Text, Button, Badge, InputLabel, rem, useMantineTheme} from '@mantine/core';
import {IconTags} from '@tabler/icons-react';
import {Tag} from '@/Api/Tags';
import {ContentType} from '@/Api/Contents';
import {useTagGroups} from '@/Hooks/useTagsQueries';

interface TagsSelectorProps {
    /** Currently selected tags */
    selectedTags: string[];
    /** Callback when tags picker should be opened */
    onOpenTagsPicker: () => void;
    /** Optional label override */
    label?: string;
    /** Optional description */
    description?: string;
    /** Show empty state message */
    showEmptyState?: boolean;
    /** Content type to filter tags */
    contentType?: ContentType;
}

/**
 * Tags selector component that displays selected tags and provides access to tag picker.
 * Follows the same visual pattern as metrics selector for consistency.
 */
export const TagsSelector: React.FC<TagsSelectorProps> = ({
    selectedTags,
    onOpenTagsPicker,
    label = 'Tags',
    description,
    showEmptyState = true,
    contentType,
}) => {
    const theme = useMantineTheme();
    const hasSelectedTags = selectedTags && selectedTags.length > 0;

    // Fetch tag groups for the content type (includes embedded tags)
    const {data: tagGroupsResult, isLoading: isLoadingTags} = useTagGroups({
        contentType,
        enabled: hasSelectedTags && !!contentType,
    });

    // Extract all tags from tag groups and create a lookup map
    const allTagsMap = useMemo(() => {
        if (!tagGroupsResult?.records) return {};

        const tagsMap: Record<string, Tag> = {};
        tagGroupsResult.records.forEach((group) => {
            group.tags?.forEach((tag) => {
                tagsMap[tag.id] = tag;
            });
        });
        return tagsMap;
    }, [tagGroupsResult]);

    // Get tag details for selected tags
    const selectedTagsWithDetails = useMemo(() => {
        return selectedTags.map((tagId) => allTagsMap[tagId]).filter((tag): tag is Tag => !!tag);
    }, [selectedTags, allTagsMap]);

    return (
        <Stack gap="xs">
            <Group
                justify="space-between"
                align="center"
            >
                <InputLabel
                    c={'#000000'}
                    size={'lg'}
                >
                    {label}
                </InputLabel>
                <Button
                    variant="light"
                    size={'compact-xs'}
                    leftSection={<IconTags size={14} />}
                    onClick={onOpenTagsPicker}
                    styles={{
                        root: {
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-blue-1)',
                            },
                        },
                    }}
                >
                    {hasSelectedTags ? 'Edit Tags' : 'Select Tags'}
                </Button>
            </Group>

            {description && (
                <Text
                    size="xs"
                    c="dimmed"
                    style={{lineHeight: 1.4}}
                >
                    {description}
                </Text>
            )}

            {hasSelectedTags ? (
                <Group gap="xs">
                    {selectedTagsWithDetails.map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="outline"
                            color="gray"
                            styles={{
                                root: {
                                    borderRadius: rem(6),
                                    fontSize: rem(11),
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    border: `1px solid ${theme.colors.gray[4]}`,
                                    color: theme.colors.gray[7],
                                    backgroundColor: 'white',
                                    '&:hover': {
                                        backgroundColor: theme.colors.gray[0],
                                        borderColor: theme.colors.gray[5],
                                    },
                                },
                            }}
                        >
                            {tag.name}
                        </Badge>
                    ))}
                    {/* Show loading state if tags are still being fetched */}
                    {isLoadingTags && selectedTags.length > selectedTagsWithDetails.length && (
                        <Badge
                            variant="outline"
                            color="gray"
                            styles={{
                                root: {
                                    borderRadius: rem(6),
                                    fontSize: rem(11),
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    border: `1px solid ${theme.colors.gray[4]}`,
                                    color: theme.colors.gray[7],
                                    backgroundColor: 'white',
                                },
                            }}
                        >
                            Loading...
                        </Badge>
                    )}
                </Group>
            ) : (
                showEmptyState && (
                    <Text
                        size="xs"
                        c="dimmed"
                        style={{
                            lineHeight: 1.4,
                            fontStyle: 'italic',
                        }}
                    >
                        No tags selected. Click "Select Tags" to organize this content and make it easier to find.
                    </Text>
                )
            )}
        </Stack>
    );
};
