import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Checkbox,
    Chip,
    Divider,
    Group,
    ScrollArea,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';

import {Content} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs.tsx';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {useContents} from '@/hooks/useContentsQueries';

import RecordsList from '../layouts/RecordsList';

interface ContentCardProps {
    content: Content;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

const ContentCard = ({content, isSelected, onToggleSelect}: ContentCardProps) => {
    const typeConfig = CONTENT_TYPE_CONFIG[content.type];
    const IconComponent = typeConfig.icon;

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${content.name}: ${content.instructions || typeConfig.description}`}
            onClick={() => onToggleSelect(content.id)}
            p="sm"
            role="button"
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                borderColor: isSelected ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-gray-3)',
                borderRadius: 8,
                boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'all 200ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: isSelected ? 'var(--mantine-color-blue-1)' : 'var(--mantine-color-blue-0)',
                        borderColor: 'var(--mantine-color-blue-4)',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                        transform: 'scale(1.01)',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="center"
                gap="sm"
                wrap="nowrap"
            >
                <Checkbox
                    checked={isSelected}
                    color="blue"
                    onChange={() => onToggleSelect(content.id)}
                    onClick={(e) => e.stopPropagation()}
                    size="sm"
                />
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
                        color="var(--mantine-color-gray-6)"
                        size={20}
                    />
                </Center>
                <Box style={{flex: 1, minWidth: 0}}>
                    <Text
                        fw={600}
                        lineClamp={1}
                        mb={2}
                        size="sm"
                        style={{lineHeight: 1.3}}
                    >
                        {content.name}
                    </Text>
                    <Text
                        c="dimmed"
                        lineClamp={2}
                        mb="xs"
                        size="xs"
                        style={{lineHeight: 1.4}}
                    >
                        {content.instructions || typeConfig.description}
                    </Text>
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        <Badge
                            color="blue"
                            radius="sm"
                            size="xs"
                            style={{textTransform: 'capitalize'}}
                            variant="light"
                        >
                            {typeConfig.label}
                        </Badge>
                        {content.duration && (
                            <Badge
                                color="gray"
                                radius="sm"
                                size="xs"
                                variant="outline"
                            >
                                {content.duration} min
                            </Badge>
                        )}
                        {!content.is_published && (
                            <Badge
                                color="yellow"
                                radius="sm"
                                size="xs"
                                variant="outline"
                            >
                                Draft
                            </Badge>
                        )}
                    </Group>
                </Box>
            </Group>
        </Card>
    );
};

interface SelectedItemsProps {
    onClearAll: () => void;
    onRemove: (id: string) => void;
    selectedItems: Content[];
}

const SelectedItems = ({onClearAll, onRemove, selectedItems}: SelectedItemsProps) => {
    if (selectedItems.length === 0) return null;

    return (
        <Box>
            <Group
                align="center"
                justify="space-between"
                mb="xs"
            >
                <Text
                    fw={500}
                    size="sm"
                >
                    Selected ({selectedItems.length})
                </Text>
                <Button
                    color="gray"
                    onClick={onClearAll}
                    size="xs"
                    variant="subtle"
                >
                    Clear all
                </Button>
            </Group>
            <ScrollArea.Autosize mah={120}>
                <Group gap="xs">
                    {selectedItems.map((item) => (
                        <Chip
                            checked={true}
                            color="blue"
                            key={item.id}
                            onChange={() => onRemove(item.id)}
                            radius="sm"
                            size="sm"
                            variant="filled"
                        >
                            <Group
                                gap={4}
                                wrap="nowrap"
                            >
                                <Text
                                    size="xs"
                                    style={{maxWidth: 100}}
                                    truncate
                                >
                                    {item.name}
                                </Text>
                                <ActionIcon
                                    color="white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(item.id);
                                    }}
                                    size={14}
                                    variant="transparent"
                                >
                                    <XIcon size={10} />
                                </ActionIcon>
                            </Group>
                        </Chip>
                    ))}
                </Group>
            </ScrollArea.Autosize>
        </Box>
    );
};

interface SearchAndFilterProps {
    contentTypeFilter: string;
    isLoading: boolean;
    onContentTypeChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    resultsCount: number;
    searchTerm: string;
}

const SearchAndFilter = ({
    contentTypeFilter,
    isLoading,
    onContentTypeChange,
    onSearchChange,
    resultsCount,
    searchTerm,
}: SearchAndFilterProps) => {
    return (
        <Stack gap="sm">
            <TextInput
                leftSection={<MagnifyingGlassIcon size={16} />}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                placeholder="Search content..."
                rightSection={
                    searchTerm && (
                        <ActionIcon
                            color="gray"
                            onClick={() => onSearchChange('')}
                            size="sm"
                            variant="subtle"
                        >
                            <XIcon size={14} />
                        </ActionIcon>
                    )
                }
                value={searchTerm}
            />

            <Group
                align="center"
                justify="space-between"
            >
                <SegmentedControl
                    data={[
                        {label: 'All', value: 'all'},
                        ...Object(CONTENT_TYPE_CONFIG)
                            .keys()
                            .map((key) => ({
                                label: CONTENT_TYPE_CONFIG[key].label,
                                value: CONTENT_TYPE_CONFIG[key].value,
                            })),
                    ]}
                    onChange={onContentTypeChange}
                    size="xs"
                    value={contentTypeFilter}
                />

                {!isLoading && (
                    <Text
                        c="dimmed"
                        size="xs"
                    >
                        {resultsCount} {resultsCount === 1 ? 'item' : 'items'} found
                    </Text>
                )}
            </Group>
        </Stack>
    );
};

interface ContentSelectProps {
    contentType?: string;
    onCancel?: () => void;
    onComplete?: (selectedIds: string[]) => void;
}

export default function ContentSelect(props: ContentSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [contentTypeFilter, setContentTypeFilter] = useState(props.contentType || 'all');
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

    const onSearchChangeDebounced = useDebouncedCallback(setSearchTerm, 300);

    const {data, fetchNextPage, isFetchingNextPage, isLoading} = useContents({
        page_size: 20,
        search: searchTerm,
    });

    const contents = useMemo(() => {
        return data?.pages?.flatMap((page) => page.records) || [];
    }, [data?.pages]);

    const selectedItems = useMemo(() => {
        return contents.filter((content) => localSelectedIds.includes(content.id));
    }, [contents, localSelectedIds]);

    const toggleSelection = (id: string) => {
        setLocalSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const removeFromSelection = (id: string) => {
        setLocalSelectedIds((prev) => prev.filter((item) => item !== id));
    };

    const clearAllSelection = () => {
        setLocalSelectedIds([]);
    };

    const handleComplete = () => {
        props.onComplete?.(localSelectedIds);
    };

    return (
        <Stack>
            <SearchAndFilter
                contentTypeFilter={contentTypeFilter}
                isLoading={isLoading}
                onContentTypeChange={setContentTypeFilter}
                onSearchChange={onSearchChangeDebounced}
                resultsCount={contents.length}
                searchTerm={searchTerm}
            />

            <SelectedItems
                onClearAll={clearAllSelection}
                onRemove={removeFromSelection}
                selectedItems={selectedItems}
            />

            {localSelectedIds.length > 0 && <Divider />}

            <RecordsList<Content>
                emptyState={
                    searchTerm || contentTypeFilter !== 'all'
                        ? 'No content matches your search criteria'
                        : 'No content available'
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
                        onToggleSelect={toggleSelection}
                    />
                )}
            />

            <FixedBottom
                isSubmitting={false}
                label={
                    localSelectedIds.length === 0
                        ? 'Select content to continue'
                        : `Add ${localSelectedIds.length} ${localSelectedIds.length === 1 ? 'item' : 'items'}`
                }
                onSubmit={handleComplete}
            />
        </Stack>
    );
}
