import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Card,
    Center,
    Checkbox,
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
import {useEffect, useMemo, useState} from 'react';

import {Content, useListContentsInfiniteQuery} from '@/services/contents';
import {CONTENT_TYPE_CONFIG} from '@/shared/Configs.tsx';
import {FixedBottom} from '@/shared/containers/FixedBottom';

import RecordsList from '../layouts/RecordsList';

interface ExerciseCardProps {
    exercise: Content;
    isSelected: boolean;
    multiple: boolean;
    onToggleSelect: (id: string) => void;
}

/**
 * ExerciseCard - Individual exercise item card
 * Follows best practices:
 * - Clear visual feedback for selection state
 * - Accessible with keyboard navigation
 * - Smooth hover transitions
 * - Descriptive ARIA labels
 * - Single-select: No checkbox, immediate selection on click
 * - Multi-select: Checkbox for explicit selection
 */
const ExerciseCard = ({exercise, isSelected, multiple, onToggleSelect}: ExerciseCardProps) => {
    const typeConfig = CONTENT_TYPE_CONFIG.exercise;
    const IconComponent = typeConfig.icon;
    const definition = exercise.exercise_definition;

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${exercise.name}: ${exercise.description || ''}`}
            onClick={() => onToggleSelect(exercise.id)}
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
                        onChange={() => onToggleSelect(exercise.id)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleSelect(exercise.id);
                            }
                        }}
                        size="md"
                        styles={{
                            input: {
                                cursor: 'pointer',
                            },
                        }}
                        tabIndex={0}
                    />
                )}

                {/* Exercise Icon */}
                <Avatar
                    color={typeConfig.badgeColor}
                    radius="xl"
                    size="lg"
                    styles={{
                        root: {
                            flexShrink: 0,
                        },
                    }}
                >
                    <IconComponent
                        size={24}
                        stroke={1.5}
                    />
                </Avatar>

                {/* Exercise Details */}
                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={600}
                        lineClamp={1}
                        size="sm"
                    >
                        {exercise.name}
                    </Text>

                    {/* Definition Metadata */}
                    {definition && (
                        <Group gap="xs">
                            {definition.primary_muscle && definition.primary_muscle.length > 0 && (
                                <Badge
                                    color="gray"
                                    size="xs"
                                    variant="light"
                                >
                                    {definition.primary_muscle.join(', ')}
                                </Badge>
                            )}
                            {definition.equipment && definition.equipment.length > 0 && (
                                <Text
                                    c="dimmed"
                                    lineClamp={1}
                                    size="xs"
                                >
                                    Equipment: {definition.equipment.join(', ')}
                                </Text>
                            )}
                        </Group>
                    )}

                    {/* Instructions/Description */}
                    {exercise.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            size="xs"
                        >
                            {exercise.description}
                        </Text>
                    )}
                </Stack>

                {/* Selection Indicator - Only in single-select mode */}
                {!multiple && isSelected && (
                    <ActionIcon
                        color="blue"
                        radius="xl"
                        size="lg"
                        variant="filled"
                    >
                        <CheckIcon
                            size={18}
                            weight="bold"
                        />
                    </ActionIcon>
                )}
            </Group>
        </Card>
    );
};

interface ExerciseSelectProps {
    multiple?: boolean;
    onComplete?: (selectedIds: string[], selectedExercises?: Content[]) => void;
}

/**
 * ExerciseSelect - Main modal content for selecting exercises
 *
 * Best practices implemented:
 * - Sticky header with search and selection count
 * - Fixed bottom CTA with clear actions
 * - Infinite scroll for performance
 * - Accessible keyboard navigation
 * - Clear visual feedback for all interactions
 * - Single-select: Immediate selection, no save button needed
 * - Multi-select: Explicit save action with selection count
 */
export default function ExerciseSelect(props: ExerciseSelectProps) {
    const {multiple = true, onComplete} = props;

    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [contentsMap, setContentsMap] = useState<Record<string, Content>>({});

    const onSearchChangeDebounced = useDebouncedCallback(setSearch, 300);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListContentsInfiniteQuery({
        scope: 'all',
        content_type: 'exercise',
        page_size: 20,
        search: search || undefined,
    });

    const exercises = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data?.pages]);

    // Update contents map when exercises change
    useEffect(() => {
        const newMap = {...contentsMap};
        exercises.forEach((exercise) => {
            newMap[exercise.id] = exercise;
        });
        setContentsMap(newMap);
    }, [exercises, contentsMap]);

    const handleToggleSelect = (id: string) => {
        // For single-select mode, immediately call onComplete and return
        if (!multiple) {
            const selectedExercise = contentsMap[id];
            onComplete?.([id], selectedExercise ? [selectedExercise] : undefined);
            return;
        }

        // For multi-select mode, toggle the selection
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]));
    };

    const handleSave = () => {
        const selectedExercises = selectedIds.map((id) => contentsMap[id]).filter(Boolean);
        onComplete?.(selectedIds, selectedExercises);
    };

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            {/* Sticky Header */}
            <Paper
                p="md"
                shadow="xs"
                style={{
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                    flexShrink: 0,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Stack gap="md">
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Title order={4}>Select Exercise{multiple ? 's' : ''}</Title>
                        {multiple && selectedIds.length > 0 && (
                            <Badge
                                color="blue"
                                size="lg"
                                variant="filled"
                            >
                                {selectedIds.length} selected
                            </Badge>
                        )}
                    </Group>

                    <TextInput
                        leftSection={<MagnifyingGlassIcon size={18} />}
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        placeholder="Search exercises..."
                        rightSection={
                            search ? (
                                <ActionIcon
                                    onClick={() => {
                                        setSearch('');
                                        onSearchChangeDebounced('');
                                    }}
                                    size="sm"
                                    variant="subtle"
                                >
                                    <XIcon size={16} />
                                </ActionIcon>
                            ) : null
                        }
                        size="md"
                    />
                </Stack>
            </Paper>

            {/* Scrollable Exercise List */}
            <Box style={{flex: 1, overflow: 'auto'}}>
                <Box p="md">
                    {isLoading ? (
                        <Center py="xl">
                            <Loader size="lg" />
                        </Center>
                    ) : exercises.length === 0 ? (
                        <Paper
                            p="xl"
                            style={{textAlign: 'center'}}
                        >
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                No exercises found
                            </Text>
                        </Paper>
                    ) : (
                        <RecordsList
                            emptyState={
                                <Paper
                                    p="xl"
                                    style={{textAlign: 'center'}}
                                >
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        No exercises found
                                    </Text>
                                </Paper>
                            }
                            fetchNextPage={fetchNextPage}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            isLoading={isLoading}
                            records={exercises}
                            renderItem={(exercise: Content) => (
                                <ExerciseCard
                                    exercise={exercise}
                                    isSelected={selectedIds.includes(exercise.id)}
                                    key={exercise.id}
                                    multiple={multiple}
                                    onToggleSelect={handleToggleSelect}
                                />
                            )}
                        />
                    )}
                </Box>
            </Box>

            {/* Fixed Bottom CTA - Only in multi-select mode */}
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
                            selectedIds.length === 0
                                ? 'Select at least one'
                                : `Add ${selectedIds.length} Exercise${selectedIds.length === 1 ? '' : 's'}`
                        }
                        onSubmit={handleSave}
                    />
                </Box>
            )}
        </Box>
    );
}
