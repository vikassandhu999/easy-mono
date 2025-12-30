import {Card, Group, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconCalendar, IconChevronRight, IconSalad} from '@tabler/icons-react';
import {useMemo} from 'react';

import {NutritionPlan, useListNutritionPlans} from '@/services/nutrition_plans';
import RecordsList from '@/shared/layouts/RecordsList';

// Color dots for visual variety
const DOT_COLORS = [
    'var(--mantine-color-green-5)',
    'var(--mantine-color-teal-5)',
    'var(--mantine-color-lime-5)',
    'var(--mantine-color-emerald-5)',
    'var(--mantine-color-cyan-5)',
    'var(--mantine-color-blue-5)',
    'var(--mantine-color-violet-5)',
    'var(--mantine-color-grape-5)',
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

interface NutritionPlanListItemProps {
    onClick?: (id: string) => void;
    plan: NutritionPlan;
}

const NutritionPlanListItem = ({plan, onClick}: NutritionPlanListItemProps) => {
    const dotColor = getDotColor(plan.id);
    const mealsCount = plan.meals?.length ?? 0;

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
                        <Group gap={4}>
                            <IconCalendar size={13} />
                            <Text size="xs">Weekly</Text>
                        </Group>
                        {mealsCount > 0 && (
                            <Group gap={4}>
                                <IconSalad size={13} />
                                <Text size="xs">
                                    {mealsCount} {mealsCount === 1 ? 'meal' : 'meals'}
                                </Text>
                            </Group>
                        )}
                        {mealsCount === 0 && plan.description && (
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

export interface NutritionPlanListProps {
    clientId?: string;
    onPlanClick?: (id: string) => void;
    search?: string;
}

const NutritionPlanList = ({onPlanClick, search, clientId}: NutritionPlanListProps) => {
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListNutritionPlans({
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
                        size={48}
                        variant="light"
                    >
                        <IconSalad
                            size={24}
                            stroke={1.5}
                        />
                    </ThemeIcon>
                    <Text
                        c="dimmed"
                        fw={500}
                        size="sm"
                    >
                        {search ? 'No nutrition plans match your search' : 'No nutrition plans yet'}
                    </Text>
                    <Text
                        c="dimmed"
                        size="xs"
                        ta="center"
                    >
                        {search
                            ? 'Try a different search term'
                            : 'To Create your first nutrition plan click on + Create button'}
                    </Text>
                </Stack>
            }
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            records={plans}
            renderItem={(plan) => (
                <NutritionPlanListItem
                    key={plan.id}
                    onClick={onPlanClick}
                    plan={plan}
                />
            )}
        />
    );
};

export default NutritionPlanList;
