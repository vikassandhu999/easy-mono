import {AspectRatio, Badge, Card, Group, Image, Stack, Text} from '@mantine/core';
import {useMemo} from 'react';

import PlanSampleImage from '@/../public/empty_plan.png';
import {NutritionPlan, useListNutritionPlans} from '@/services/nutrition_plans';
import RecordsList from '@/shared/layouts/RecordsList';

interface NutritionPlanListItemProps {
    onClick?: (id: string) => void;
    plan: NutritionPlan;
}

const NutritionPlanListItem = ({plan, onClick}: NutritionPlanListItemProps) => {
    return (
        <Card
            bg="gray.1"
            onClick={() => {
                onClick?.(plan.id);
            }}
            radius="xl"
            style={{cursor: 'pointer'}}
            withBorder={false}
        >
            <Group
                align="flex-start"
                wrap="nowrap"
            >
                <AspectRatio
                    flex="0 0 80px"
                    ratio={1}
                >
                    <Image
                        height={80}
                        radius="lg"
                        src={plan.thumbnail_url || PlanSampleImage}
                        width={80}
                    />
                </AspectRatio>
                <Stack gap="sm">
                    <Text fw={500}>{plan.name}</Text>
                    {plan.description && (
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {plan.description}
                        </Text>
                    )}
                    <Group gap="xs">
                        {plan.duration_weeks && (
                            <Badge
                                color="blue"
                                variant="light"
                            >
                                {plan.duration_weeks} weeks
                            </Badge>
                        )}
                        {plan.tags?.map((tag) => (
                            <Badge
                                color="gray"
                                key={tag}
                                variant="light"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
};

export interface NutritionPlanListProps {
    onPlanClick?: (id: string) => void;
    search?: string;
}

const NutritionPlanList = ({onPlanClick, search}: NutritionPlanListProps) => {
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListNutritionPlans({
        search: search || undefined,
        is_template: true,
    });

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    return (
        <RecordsList
            emptyState={<div>No Plan Found</div>}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            records={plans}
            renderItem={(plan) => (
                <NutritionPlanListItem
                    onClick={onPlanClick}
                    plan={plan}
                />
            )}
        />
    );
};

export default NutritionPlanList;
