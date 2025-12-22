import {capitalizeWords} from '@easy/error-parser';
import {Avatar, Badge, Button, Card, Checkbox, Group, Modal, Stack, Text, useMantineTheme} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {BarbellIcon, CaretDownIcon, XIcon} from '@phosphor-icons/react';
import {useMemo, useState} from 'react';

import {Exercise, isSystemExercise, useListExercises} from '@/services/exercises';
import {useListMuscles} from '@/services/muscles';
import RecordsList from '@/shared/layouts/RecordsList';

import classes from './styles.module.css';

interface ExerciseListItemProps {
    exercise: Exercise;
    onClick?: (id: string) => void;
}

const ExerciseListItem = ({exercise, onClick}: ExerciseListItemProps) => {
    const theme = useMantineTheme();
    const isSystem = isSystemExercise(exercise);
    const firstImage = exercise.images?.[0];

    return (
        <Card
            onClick={() => {
                onClick?.(exercise.id);
            }}
            radius="xl"
            shadow={theme.shadows.xs}
            style={{cursor: 'pointer'}}
            withBorder={true}
        >
            <Group
                align="flex-start"
                wrap="nowrap"
            >
                {/* Exercise Image */}
                <Avatar
                    radius="md"
                    size="lg"
                    src={firstImage}
                >
                    <BarbellIcon size={24} />
                </Avatar>

                <Stack gap="sm">
                    <Group gap="xs">
                        <Text fw={500}>{exercise.name}</Text>
                        {isSystem ? (
                            <Badge
                                color="gray"
                                size="xs"
                                variant="light"
                            >
                                From Coacheasy
                            </Badge>
                        ) : (
                            <Badge
                                color="gray"
                                size="xs"
                                variant="light"
                            >
                                Created By You
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
                    <Group gap="xs">
                        {exercise.mechanics && (
                            <Badge
                                color="blue"
                                variant="light"
                            >
                                {exercise.mechanics}
                            </Badge>
                        )}
                        {exercise.force && (
                            <Badge
                                color="grape"
                                variant="light"
                            >
                                {exercise.force}
                            </Badge>
                        )}
                    </Group>
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

    // Fetch muscles for filter
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
        <div className={classes.container}>
            {/* Muscle Filter */}
            <div className={classes.filterRow}>
                <button
                    className={`${classes.muscleFilterButton} ${selectedMuscleIds.length > 0 ? classes.muscleFilterButtonActive : ''}`}
                    onClick={handleOpenModal}
                    type="button"
                >
                    <BarbellIcon size={14} />
                    <span>Muscles</span>
                    {selectedMuscleIds.length > 0 && (
                        <span className={classes.muscleCount}>{selectedMuscleIds.length}</span>
                    )}
                    <CaretDownIcon size={14} />
                </button>

                {/* Selected muscle chips */}
                {selectedMuscleIds.length > 0 && (
                    <div className={classes.selectedChips}>
                        {selectedMuscleIds.map((muscleId) => {
                            const muscle = muscles.find((m) => m.id === muscleId);
                            if (!muscle) return null;
                            return (
                                <button
                                    className={classes.selectedChip}
                                    key={muscleId}
                                    onClick={() => handleRemoveMuscle(muscleId)}
                                    type="button"
                                >
                                    {muscle.name}
                                    <XIcon size={12} />
                                </button>
                            );
                        })}
                        <button
                            className={classes.clearAllButton}
                            onClick={handleClearMuscleFilters}
                            type="button"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Muscle Filter Modal */}
            <Modal
                centered
                onClose={closeModal}
                opened={modalOpened}
                size="sm"
                title="Filter by Muscles"
            >
                <Stack gap="md">
                    <Group gap="xs">
                        {muscles.map((muscle) => (
                            <Checkbox
                                checked={tempSelectedMuscleIds.includes(muscle.id)}
                                key={muscle.id}
                                label={capitalizeWords(muscle.name)}
                                onChange={() => handleToggleMuscle(muscle.id)}
                            />
                        ))}
                    </Group>

                    <Group
                        gap="sm"
                        justify="flex-end"
                        mt="md"
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
                            Apply Filters
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <RecordsList
                emptyState={<Text>No Exercise Found</Text>}
                fetchNextPage={fetchNextPage}
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
        </div>
    );
};

export default ExerciseList;
