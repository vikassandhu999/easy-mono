import {capitalizeWords} from '@easy/error-parser';
import {Avatar, Badge, Button, Card, Checkbox, Group, Modal, SimpleGrid, Stack, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {BarbellIcon, CaretDownIcon, XIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';

import {Exercise, isSystemExercise, useListExercises} from '@/services/exercises';
import {useListMuscles} from '@/services/muscles';
import RecordsList from '@/shared/layouts/RecordsList';

interface ExerciseListItemProps {
    exercise: Exercise;
    onClick?: (id: string) => void;
}

const ExerciseListItem = ({exercise, onClick}: ExerciseListItemProps) => {
    const isSystem = isSystemExercise(exercise);
    const firstImage = exercise.images?.[0];

    return (
        <Card
            aria-label={`Exercise: ${exercise.name}`}
            onClick={() => onClick?.(exercise.id)}
            padding="md"
            radius="lg"
            role="button"
            shadow={'xl'}
            style={{
                cursor: 'pointer',
                outline: 0,
                transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            }}
            styles={{
                root: {
                    minHeight: 'var(--touch-target-min)',
                    '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                    '&:focus-visible': {
                        outline: '2px solid var(--mantine-color-brand-6)',
                        outlineOffset: '2px',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="flex-start"
                wrap="nowrap"
            >
                <Avatar
                    radius="md"
                    size="lg"
                    src={firstImage}
                >
                    <BarbellIcon size={24} />
                </Avatar>

                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        <Text
                            fw={500}
                            lineClamp={1}
                        >
                            {exercise.name}
                        </Text>
                        {!isSystem && (
                            <Badge
                                color="gray"
                                size="xs"
                                variant="light"
                            >
                                {'Custom'}
                            </Badge>
                        )}
                    </Group>

                    {exercise.description && (
                        <Text
                            c="dimmed"
                            lineClamp={1}
                            size="sm"
                        >
                            {exercise.description}
                        </Text>
                    )}

                    {(exercise.mechanics || exercise.force) && (
                        <Group gap="xs">
                            {exercise.mechanics && (
                                <Badge
                                    color="blue"
                                    size="sm"
                                    variant="light"
                                >
                                    {exercise.mechanics}
                                </Badge>
                            )}
                            {exercise.force && (
                                <Badge
                                    color="grape"
                                    size="sm"
                                    variant="light"
                                >
                                    {exercise.force}
                                </Badge>
                            )}
                        </Group>
                    )}
                </Stack>
            </Group>
        </Card>
    );
};

export interface ExerciseListProps {
    onExerciseClick?: (id: string) => void;
    search?: string;
}

const ExerciseList = ({onExerciseClick, search}: ExerciseListProps) => {
    const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);
    const [tempSelectedMuscleIds, setTempSelectedMuscleIds] = useState<string[]>([]);
    const [modalOpened, {open: openModal, close: closeModal}] = useDisclosure(false);

    const {data: musclesData} = useListMuscles({});
    const muscles = useMemo(() => musclesData?.data ?? [], [musclesData?.data]);

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
        search: search || undefined,
        muscle_ids: selectedMuscleIds.length > 0 ? selectedMuscleIds : undefined,
    });

    const exercises = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    const handleToggleMuscle = (muscleId: string) => {
        setTempSelectedMuscleIds((prev) =>
            prev.includes(muscleId) ? prev.filter((id) => id !== muscleId) : [...prev, muscleId],
        );
    };

    const handleClearMuscleFilters = () => {
        setSelectedMuscleIds([]);
        setTempSelectedMuscleIds([]);
    };

    const handleOpenModal = () => {
        setTempSelectedMuscleIds(selectedMuscleIds);
        openModal();
    };

    const handleApplyFilters = () => {
        setSelectedMuscleIds(tempSelectedMuscleIds);
        closeModal();
    };

    const handleRemoveMuscle = (muscleId: string) => {
        setSelectedMuscleIds((prev) => prev.filter((id) => id !== muscleId));
    };

    return (
        <Stack gap="md">
            <Group
                gap="sm"
                wrap="wrap"
            >
                <Button
                    color={selectedMuscleIds.length > 0 ? 'blue' : 'gray'}
                    leftSection={<BarbellIcon size={14} />}
                    onClick={handleOpenModal}
                    // radius="xl"
                    rightSection={<CaretDownIcon size={14} />}
                    size={'compact-xs'}
                    variant={selectedMuscleIds.length > 0 ? 'light' : 'default'}
                >
                    Muscles
                    {selectedMuscleIds.length > 0 && (
                        <Badge
                            circle
                            ml="xs"
                            size="sm"
                        >
                            {selectedMuscleIds.length}
                        </Badge>
                    )}
                </Button>

                {selectedMuscleIds.length > 0 && (
                    <Group gap="xs">
                        {selectedMuscleIds.map((muscleId) => {
                            const muscle = muscles.find((m) => m.id === muscleId);
                            if (!muscle) return null;
                            return (
                                <Badge
                                    color="blue"
                                    key={muscleId}
                                    onClick={() => handleRemoveMuscle(muscleId)}
                                    rightSection={
                                        <XIcon
                                            size={12}
                                            style={{cursor: 'pointer'}}
                                        />
                                    }
                                    size="lg"
                                    style={{cursor: 'pointer'}}
                                    variant="light"
                                >
                                    {muscle.name}
                                </Badge>
                            );
                        })}
                        <Button
                            color="red"
                            onClick={handleClearMuscleFilters}
                            size="xs"
                            variant="subtle"
                        >
                            Clear all
                        </Button>
                    </Group>
                )}
            </Group>

            <Modal
                centered
                onClose={closeModal}
                opened={modalOpened}
                size="sm"
                title="Filter by muscles"
            >
                <Stack gap="md">
                    <SimpleGrid cols={2}>
                        {muscles.map((muscle) => (
                            <Checkbox
                                checked={tempSelectedMuscleIds.includes(muscle.id)}
                                key={muscle.id}
                                label={capitalizeWords(muscle.name)}
                                onChange={() => handleToggleMuscle(muscle.id)}
                            />
                        ))}
                    </SimpleGrid>

                    <Group
                        gap="md"
                        justify="flex-end"
                    >
                        {tempSelectedMuscleIds.length > 0 && (
                            <Button
                                color="gray"
                                onClick={() => setTempSelectedMuscleIds([])}
                                size="sm"
                                variant="subtle"
                            >
                                Clear
                            </Button>
                        )}
                        <Button
                            onClick={handleApplyFilters}
                            radius="xl"
                            size="sm"
                        >
                            Apply filters
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <RecordsList
                emptyState={<Text>No Exercise Found</Text>}
                fetchNextPage={fetchNextPage}
                gap={'xs'}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isLoading}
                records={exercises}
                renderItem={(exercise) => (
                    <ExerciseListItem
                        exercise={exercise}
                        onClick={onExerciseClick}
                    />
                )}
            />
        </Stack>
    );
};

export default ExerciseList;
