import {Badge, Card, Center, Group, Skeleton, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconBarbell, IconChevronRight, IconListNumbers} from '@tabler/icons-react';
import {useMemo} from 'react';

import {TrainingPlan, useListTrainingPlans} from '@/services/training_plans';
import RecordsList from '@/shared/layouts/RecordsList';

interface TrainingPlanListItemProps {
    onClick?: (id: string) => void;
    plan: TrainingPlan;
}

const TrainingPlanListItem = ({plan, onClick}: TrainingPlanListItemProps) => {
    const workoutCount = plan.workouts?.length ?? 0;

    const handleClick = () => {
        onClick?.(plan.id);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.(plan.id);
        }
    };

    return (
        <Card
            aria-label={`Training plan: ${plan.name}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
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
                align="center"
                gap="md"
                wrap="nowrap"
            >
                <Stack
                    gap={4}
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={600}
                        lineClamp={1}
                        size={'sm'}
                    >
                        {plan.name}
                    </Text>

                    {workoutCount === 0 && plan.description && (
                        <Text
                            c="dimmed"
                            lineClamp={1}
                            size="xs"
                        >
                            {plan.description}
                        </Text>
                    )}

                    {workoutCount > 0 && (
                        <Group gap="xs">
                            <Badge
                                color="blue"
                                leftSection={<IconListNumbers size={12} />}
                                size="xs"
                                variant="light"
                            >
                                {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
                            </Badge>
                        </Group>
                    )}
                </Stack>

                <IconChevronRight
                    color="var(--mantine-color-gray-5)"
                    size={18}
                    style={{flexShrink: 0}}
                />
            </Group>
        </Card>
    );
};

/* Skeleton loader for better perceived performance */
const TrainingPlanListSkeleton = () => (
    <>
        {[1, 2, 3].map((i) => (
            <Card
                key={i}
                padding="md"
                radius="lg"
                withBorder
            >
                <Group
                    align="center"
                    gap="md"
                    wrap="nowrap"
                >
                    <Skeleton
                        height={44}
                        radius="md"
                        width={44}
                    />
                    <Stack
                        gap={8}
                        style={{flex: 1}}
                    >
                        <Skeleton height={14} />
                        <Skeleton
                            height={16}
                            radius="xl"
                            width={110}
                        />
                    </Stack>
                </Group>
            </Card>
        ))}
    </>
);

export interface TrainingPlanListProps {
    clientId?: string;
    onPlanClick?: (id: string) => void;
    search?: string;
}

const TrainingPlanList = ({onPlanClick, search, clientId}: TrainingPlanListProps) => {
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListTrainingPlans({
        search: search || undefined,
        is_template: clientId ? undefined : true,
        client_id: clientId,
    });

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    if (isLoading) {
        return <TrainingPlanListSkeleton />;
    }

    return (
        <RecordsList
            emptyState={
                <Center py="xl">
                    <Stack
                        align="center"
                        gap="sm"
                    >
                        <ThemeIcon
                            color="gray"
                            radius="lg"
                            size={64}
                            variant="light"
                        >
                            <IconBarbell
                                size={28}
                                stroke={1.5}
                            />
                        </ThemeIcon>
                        <Text
                            c="dimmed"
                            fw={500}
                            size="sm"
                        >
                            {search ? 'No training plans match your search' : 'No training plans yet'}
                        </Text>
                        <Text
                            c="dimmed"
                            maw={260}
                            size="xs"
                            ta="center"
                        >
                            {search
                                ? 'Try a different search term'
                                : 'Create your first training plan by clicking the + button above'}
                        </Text>
                    </Stack>
                </Center>
            }
            fetchNextPage={fetchNextPage}
            gap={'xs'}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={false}
            records={plans}
            renderItem={(plan) => (
                <TrainingPlanListItem
                    key={plan.id}
                    onClick={onPlanClick}
                    plan={plan}
                />
            )}
        />
    );
};

export default TrainingPlanList;
