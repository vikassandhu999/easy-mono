import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Checkbox,
    Divider,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {CheckIcon, MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';

import {CONTENT_TYPE_CONFIG} from '@/shared/Configs.tsx';
import {FixedBottom} from '@/shared/containers/FixedBottom';
import {Content, useListContentsInfiniteQuery} from '@/store/services/contents';

import RecordsList from '../layouts/RecordsList';

interface ContentCardProps {
    content: Content;
    isSelected: boolean;
    multiple: boolean;
    onToggleSelect: (id: string) => void;
}

/**
 * ContentCard - Individual content item card
 * Follows best practices:
 * - Clear visual feedback for selection state
 * - Accessible with keyboard navigation
 * - Smooth hover transitions
 * - Descriptive ARIA labels
 * - Single-select: No checkbox, immediate selection on click
 * - Multi-select: Checkbox for explicit selection
 */
const ContentCard = ({content, isSelected, multiple, onToggleSelect}: ContentCardProps) => {
    const typeConfig = CONTENT_TYPE_CONFIG[content.type];
    const IconComponent = typeConfig.icon;

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${content.name}: ${content.description || typeConfig.description}`}
            onClick={() => onToggleSelect(content.id)}
            p="sm"
            role="button"
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                borderColor: isSelected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)',
                borderWidth: isSelected ? 2 : 1,
                borderRadius: 8,
                boxShadow: isSelected ? '0 2px 12px rgba(59, 130, 246, 0.2)' : 'none',
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'all 200ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: multiple
                            ? isSelected
                                ? 'var(--mantine-color-blue-1)'
                                : 'var(--mantine-color-gray-0)'
                            : 'var(--mantine-color-blue-0)',
                        borderColor: 'var(--mantine-color-blue-5)',
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                        transform: 'scale(1.01)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="flex-start"
                gap="sm"
                wrap="nowrap"
            >
                {/* Selection Checkbox - Only in multi-select mode */}
                {multiple && (
                    <Checkbox
                        checked={isSelected}
                        color="blue"
                        onChange={() => onToggleSelect(content.id)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onToggleSelect(content.id);
                            }
                        }}
                        size="sm"
                        styles={{
                            input: {
                                cursor: 'pointer',
                            },
                        }}
                    />
                )}

                {/* Content Icon */}
                <Center
                    h={40}
                    style={{
                        backgroundColor: typeConfig.color,
                        borderRadius: 6,
                        flexShrink: 0,
                    }}
                    w={40}
                >
                    <IconComponent
                        color="var(--mantine-color-gray-7)"
                        size={20}
                        weight="duotone"
                    />
                </Center>

                {/* Content Details */}
                <Box style={{flex: 1, minWidth: 0}}>
                    <Group
                        gap="xs"
                        mb={2}
                    >
                        <Text
                            fw={600}
                            lineClamp={1}
                            size="sm"
                            style={{flex: 1}}
                        >
                            {content.name}
                        </Text>
                        {multiple && isSelected && (
                            <Badge
                                color="blue"
                                leftSection={<CheckIcon size={10} />}
                                radius="xl"
                                size="xs"
                                variant="filled"
                            >
                                Selected
                            </Badge>
                        )}
                    </Group>

                    {content.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            mb="xs"
                            size="xs"
                            style={{lineHeight: 1.4}}
                        >
                            {content.description}
                        </Text>
                    )}

                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        <Badge
                            color="blue"
                            radius="xl"
                            size="xs"
                            style={{textTransform: 'capitalize'}}
                            variant="light"
                        >
                            {typeConfig.label}
                        </Badge>
                    </Group>
                </Box>
            </Group>
        </Card>
    );
};

interface SelectedItemsBarProps {
    onClearAll: () => void;
    selectedCount: number;
}

/**
 * SelectedItemsBar - Shows selection count and clear action
 * Best practice: Persistent selection indicator at top of modal
 */
const SelectedItemsBar = ({onClearAll, selectedCount}: SelectedItemsBarProps) => {
    if (selectedCount === 0) return null;

    return (
        <Paper
            p="sm"
            radius="xl"
            style={{
                backgroundColor: 'var(--mantine-color-blue-0)',
                border: '1px solid var(--mantine-color-blue-3)',
            }}
            withBorder
        >
            <Group
                align="center"
                justify="space-between"
            >
                <Group gap="xs">
                    <Badge
                        color="blue"
                        radius="xl"
                        size="md"
                        variant="filled"
                    >
                        {selectedCount}
                    </Badge>
                    <Text
                        fw={600}
                        size="xs"
                    >
                        {selectedCount === 1 ? 'item' : 'items'} selected
                    </Text>
                </Group>
                <Button
                    color="blue"
                    leftSection={<XIcon size={14} />}
                    onClick={onClearAll}
                    radius="xl"
                    size="xs"
                    variant="light"
                >
                    Clear all
                </Button>
            </Group>
        </Paper>
    );
};

interface SearchAndFilterProps {
    isLoading: boolean;
    onSearchChange: (value: string) => void;
    resultsCount: number;
    searchTerm: string;
}

/**
 * SearchAndFilter - Search input and results count
 * Best practices:
 * - Debounced search for performance
 * - Clear search button for easy reset
 * - Results count for user feedback
 */
const SearchAndFilter = ({isLoading, onSearchChange, resultsCount, searchTerm}: SearchAndFilterProps) => {
    return (
        <Stack gap="sm">
            {/* Search Input */}
            <TextInput
                leftSection={<MagnifyingGlassIcon size={16} />}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                placeholder="Search by name or description..."
                rightSection={
                    searchTerm ? (
                        <ActionIcon
                            color="gray"
                            onClick={() => onSearchChange('')}
                            radius="xl"
                            size="xs"
                            variant="subtle"
                        >
                            <XIcon size={14} />
                        </ActionIcon>
                    ) : null
                }
                size="sm"
                value={searchTerm}
            />

            {/* Results Count */}
            <Group
                justify="space-between"
                px="xs"
            >
                <Text
                    c="dimmed"
                    size="xs"
                >
                    {isLoading ? (
                        <Group gap="xs">
                            <Loader
                                color="blue"
                                size={12}
                                type="dots"
                            />
                            <span>Loading...</span>
                        </Group>
                    ) : (
                        <span>
                            {resultsCount} {resultsCount === 1 ? 'result' : 'results'} found
                        </span>
                    )}
                </Text>
            </Group>
        </Stack>
    );
};

interface ContentSelectProps {
    contentType?: 'exercise' | 'recipe';
    multiple?: boolean; // Default: false (single selection)
    onCancel?: () => void;
    onComplete?: (selectedIds: string[], selectedContents?: Content[]) => void;
}

/**
 * ContentSelect - Main modal content for selecting content items
 *
 * Best Modal Practices Implemented:
 * 1. Clear modal purpose with descriptive title
 * 2. Prominent search and filter options at top
 * 3. Persistent selection indicator (multi-select mode)
 * 4. Clear visual feedback for selected items
 * 5. Fixed bottom action bar for easy access
 * 6. Accessible keyboard navigation
 * 7. Proper loading states
 * 8. Descriptive empty states
 * 9. Cancel and confirm actions clearly separated
 * 10. Context-aware button labels
 * 11. Single-select mode: Auto-complete on first selection
 * 12. Multi-select mode: Explicit confirmation required
 */
export default function ContentSelect(props: ContentSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
    const multiple = props.multiple ?? false; // Default to single selection

    const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);

    const {data, fetchNextPage, isFetchingNextPage, isLoading} = useListContentsInfiniteQuery({
        page_size: 20,
        search: searchTerm,
        content_type: props.contentType || 'exercise',
        scope: 'all',
        active_only: false,
    });

    const contents = useMemo(() => {
        return data?.pages?.flatMap((page) => page.records) || [];
    }, [data?.pages]);

    const selectedItems = useMemo(() => {
        return contents.filter((content) => localSelectedIds.includes(content.id));
    }, [contents, localSelectedIds]);

    const toggleSelection = (id: string) => {
        if (multiple) {
            // Multi-select: Toggle selection
            setLocalSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
        } else {
            // Single-select: Auto-complete immediately
            const selectedContent = contents.find((c) => c.id === id);
            props.onComplete?.([id], selectedContent ? [selectedContent] : []);
        }
    };

    const clearAllSelection = () => {
        setLocalSelectedIds([]);
    };

    const handleComplete = () => {
        props.onComplete?.(localSelectedIds, selectedItems);
    };

    return (
        <Stack
            gap="md"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--mantine-spacing-md)',
                position: 'relative',
            }}
        >
            {/* Modal Header */}
            <Box>
                <Title
                    mb={4}
                    order={4}
                >
                    Select Exercise
                </Title>
                <Text
                    c="dimmed"
                    size="xs"
                >
                    {multiple ? 'Select one or more exercises' : 'Select an exercise'}
                </Text>
            </Box>

            <Divider />

            {/* Search and Filter */}
            <SearchAndFilter
                isLoading={isLoading}
                onSearchChange={onSearchChangeDebounced}
                resultsCount={contents.length}
                searchTerm={searchTerm}
            />

            {/* Selection Indicator - Only in multi-select mode */}
            {multiple && (
                <SelectedItemsBar
                    onClearAll={clearAllSelection}
                    selectedCount={localSelectedIds.length}
                />
            )}

            {/* Content List - Scrollable Area */}
            <Box
                style={{
                    flex: 1,
                    overflow: 'auto',
                    marginLeft: 'calc(var(--mantine-spacing-md) * -1)',
                    marginRight: 'calc(var(--mantine-spacing-md) * -1)',
                    paddingLeft: 'var(--mantine-spacing-md)',
                    paddingRight: 'var(--mantine-spacing-md)',
                    marginBottom: multiple ? 'calc(var(--mantine-spacing-md) + 70px)' : '0', // Space for FixedBottom only in multi-select
                }}
            >
                <RecordsList<Content>
                    emptyState={
                        searchTerm ? (
                            <Paper
                                p="lg"
                                radius="xl"
                                style={{
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                    border: '2px dashed var(--mantine-color-gray-4)',
                                }}
                            >
                                <Stack
                                    align="center"
                                    gap="sm"
                                >
                                    <MagnifyingGlassIcon
                                        size={36}
                                        style={{opacity: 0.3}}
                                        weight="duotone"
                                    />
                                    <Stack
                                        align="center"
                                        gap={2}
                                    >
                                        <Text
                                            fw={600}
                                            size="sm"
                                        >
                                            No results
                                        </Text>
                                        <Text
                                            c="dimmed"
                                            size="xs"
                                            ta="center"
                                        >
                                            Try different keywords
                                        </Text>
                                    </Stack>
                                    <Button
                                        onClick={() => setSearchTerm('')}
                                        radius="xl"
                                        size="xs"
                                        variant="light"
                                    >
                                        Clear search
                                    </Button>
                                </Stack>
                            </Paper>
                        ) : (
                            <Paper
                                p="lg"
                                radius="xl"
                                style={{
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                    border: '2px dashed var(--mantine-color-gray-4)',
                                }}
                            >
                                <Stack
                                    align="center"
                                    gap="sm"
                                >
                                    <Text
                                        fw={600}
                                        size="sm"
                                    >
                                        No exercises
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="xs"
                                    >
                                        Create exercises to get started
                                    </Text>
                                </Stack>
                            </Paper>
                        )
                    }
                    fetchNextPage={fetchNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={isLoading}
                    records={contents}
                    renderItem={(item) => (
                        <ContentCard
                            content={item}
                            isSelected={localSelectedIds.includes(item.id)}
                            key={item.id}
                            multiple={multiple}
                            onToggleSelect={toggleSelection}
                        />
                    )}
                />
            </Box>

            {/* Fixed Bottom Actions - Only in multi-select mode */}
            {multiple && (
                <Box
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 'var(--mantine-spacing-md)',
                        backgroundColor: 'white',
                        borderTop: '1px solid var(--mantine-color-gray-3)',
                        zIndex: 100,
                    }}
                >
                    <FixedBottom
                        isSubmitting={false}
                        label={
                            localSelectedIds.length === 0
                                ? 'Select at least one'
                                : `Add ${localSelectedIds.length} ${localSelectedIds.length === 1 ? 'exercise' : 'exercises'}`
                        }
                        onSubmit={handleComplete}
                    />
                </Box>
            )}
        </Stack>
    );
}
