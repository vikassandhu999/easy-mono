import {Badge, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {useMemo} from 'react';

import {Exercise, isSystemExercise, useListExercises} from '@/services/exercises';
import RecordsList from '@/shared/layouts/RecordsList';

interface ExerciseListItemProps {
    exercise: Exercise;
    onClick?: (id: string) => void;
}

const ExerciseListItem = ({exercise, onClick}: ExerciseListItemProps) => {
    const theme = useMantineTheme();
    const isSystem = isSystemExercise(exercise);

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
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
        search: search || undefined,
    });

    const exercises = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    return (
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
    );
};

export default ExerciseList;
