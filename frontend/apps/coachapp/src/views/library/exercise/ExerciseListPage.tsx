import {Button, Chip, Group, Space, TextInput, useDrawersStack} from '@mantine/core';
import {IconPlus, IconPointFilled} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import {Content, LIST_CONTENTS_FILTER, ListContentFilter} from '@/api/contents';
import ExerciseCard from '@/components/ExerciseCard';
import ExerciseCreateDrawer from '@/components/ExerciseCreateDrawer';
import {ExerciseDetailDrawer} from '@/components/ExerciseDetailDrawer';
import {useListContentsInfiniteQuery} from '@/store/services/contentsApi';

const ExerciseListPage = () => {
    const stack = useDrawersStack(['create-exercise', 'exercise-detail']);
    const [filter, setFilter] = useState<ListContentFilter>('all');
    const [search, setSearch] = useState('');
    const [selectedExercise, setSelectedExercise] = useState<Content | null>(null);

    const {data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch} = useListContentsInfiniteQuery(
        {
            queryArg: {
                search: search || undefined,
                content_type: 'exercise',
                include_metadata: true,
                filter,
                page_size: 20,
            },
        },
        {refetchOnMountOrArgChange: true},
    );

    useEffect(() => {
        refetch();
    }, [filter, refetch]);

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
                onChange={(v) => setFilter(v as ListContentFilter)}
                value={filter}
            >
                <Group
                    justify="left"
                    my="sm"
                >
                    {LIST_CONTENTS_FILTER.map((v, idx) => {
                        return (
                            <Chip
                                icon={<IconPointFilled />}
                                key={`filter-${idx}`}
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
