import {Button, Chip, Group, Space, TextInput, useDrawersStack} from '@mantine/core';
import {IconPlus, IconPointFilled} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import {ACCESS_LEVEL_FILTERS, AccessLevelFilter, Content} from '@/api/contents';
import ExerciseCard from '@/components/ExerciseCard';
import ExerciseCreateDrawer from '@/components/ExerciseCreateDrawer';
import {ExerciseDetailDrawer} from '@/components/ExerciseDetailDrawer';
import {useListContentsInfiniteQuery} from '@/store/services/contentsApi';

const ExerciseListPage = () => {
    const stack = useDrawersStack(['create-exercise', 'exercise-detail']);
    const [accessLevelFilter, setAccessLevelFilter] = useState<AccessLevelFilter>('all');
    const [search, setSearch] = useState('');
    const [selectedExercise, setSelectedExercise] = useState<Content | null>(null);

    const {data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch} = useListContentsInfiniteQuery(
        {
            search: search || undefined,
            content_type: 'exercise',
            access_level: accessLevelFilter,
            active_only: false,
            page_size: 20,
        },
        {refetchOnMountOrArgChange: true},
    );

    useEffect(() => {
        refetch();
    }, [accessLevelFilter, refetch]);

    const exercises = data?.pages.flatMap((p) => p.records) ?? [];

    const handleExerciseClick = (exercise: Content) => {
        setSelectedExercise(exercise);
        stack.open('exercise-detail');
    };

    return (
        <>
            <ExerciseCreateDrawer stack={stack} />
            <ExerciseDetailDrawer
                exercise={selectedExercise}
                stack={stack}
            />
            <Group
                align="start"
                justify="space-between"
                wrap="nowrap"
            >
                <TextInput
                    flex={1}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder="Search exercises.."
                    radius="md"
                    size="sm"
                    value={search}
                />
                <Button
                    onClick={() => {
                        stack.open('create-exercise');
                    }}
                    radius="md"
                    rightSection={<IconPlus size={16} />}
                    size="sm"
                >
                    Create Exercise
                </Button>
            </Group>

            <Chip.Group
                onChange={(v) => setAccessLevelFilter(v as AccessLevelFilter)}
                value={accessLevelFilter}
            >
                <Group
                    justify="left"
                    my="sm"
                >
                    {ACCESS_LEVEL_FILTERS.map((v, idx) => {
                        return (
                            <Chip
                                icon={<IconPointFilled />}
                                key={`access-level-${idx}`}
                                size="xs"
                                tt="capitalize"
                                value={v}
                                variant="outline"
                            >
                                {v}
                            </Chip>
                        );
                    })}
                </Group>
            </Chip.Group>

            {isLoading && <div>Loading exercises...</div>}

            {exercises.map((exercise) => (
                <>
                    <ExerciseCard
                        exercise={exercise}
                        key={exercise.id}
                        onClick={() => handleExerciseClick(exercise)}
                    />
                    <Space h="md" />
                </>
            ))}

            {hasNextPage && (
                <Button
                    disabled={isFetchingNextPage}
                    mt="sm"
                    onClick={() => fetchNextPage()}
                    radius="md"
                    size="xs"
                    variant="subtle"
                >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </Button>
            )}
        </>
    );
};
export default ExerciseListPage;
