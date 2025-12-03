import {Card, Group, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconBarbell, IconChevronRight} from '@tabler/icons-react';
import {useMemo} from 'react';

import {TrainingPlan, useListTrainingPlans} from '@/services/training_plans';
import RecordsList from '@/shared/layouts/RecordsList';

// Color dots for visual variety
const DOT_COLORS = [
    'var(--mantine-color-blue-5)',
    'var(--mantine-color-violet-5)',
    'var(--mantine-color-teal-5)',
    'var(--mantine-color-orange-5)',
    'var(--mantine-color-pink-5)',
    'var(--mantine-color-cyan-5)',
    'var(--mantine-color-grape-5)',
    'var(--mantine-color-indigo-5)',
];

// Get consistent color for a plan based on its ID
const getDotColor = (planId: string) => {
    let hash = 0;
    for (let i = 0; i < planId.length; i++) {
        const char = planId.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length];
};

interface TrainingPlanListItemProps {
    onClick?: (id: string) => void;
    plan: TrainingPlan;
}

const TrainingPlanListItem = ({plan, onClick}: TrainingPlanListItemProps) => {
    const dotColor = getDotColor(plan.id);
    const workoutCount = plan.workouts?.length ?? 0;

    return (
        <Card
            onClick={() => onClick?.(plan.id)}
            padding="md"
            radius="md"
            style={{
                cursor: 'pointer',
                transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                position: 'relative',
            }}
            styles={{
                root: {
                    '&:hover': {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                    },
                },
            }}
            withBorder={true}
        >
            {/* Color dot at top left */}
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                }}
            />

            <Group
                gap="md"
                style={{paddingLeft: 16}}
                wrap="nowrap"
            >
                {/* Content */}
                <Stack
                    gap={4}
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={500}
                        lineClamp={1}
                        size="sm"
                    >
                        {plan.name}
                    </Text>

                    <Group
                        c="dimmed"
                        gap="sm"
                    >
                        {workoutCount > 0 && (
                            <Text size="xs">
                                {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
                            </Text>
                        )}
                        {workoutCount === 0 && plan.description && (
                            <Text
                                lineClamp={1}
                                size="xs"
                            >
                                {plan.description}
                            </Text>
                        )}
                    </Group>
                </Stack>

                {/* Chevron indicator */}
                <IconChevronRight
                    color="var(--mantine-color-gray-4)"
                    size={18}
                    style={{flexShrink: 0}}
                />
            </Group>
        </Card>
    );
};

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

    return (
        <RecordsList
            emptyState={
                <Stack
                    align="center"
                    gap="sm"
                    py="xl"
                >
                    <ThemeIcon
                        color="gray"
                        radius="md"
                        size={40}
                        variant="light"
                    >
                        <IconBarbell
                            size={20}
                            stroke={1.5}
                        />
                    </ThemeIcon>
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        No training plans found
                    </Text>
                </Stack>
            }
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
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
