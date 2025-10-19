import {Button, Group, Menu, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconBowlChopsticks, IconCalendarPlus, IconTreadmill} from '@tabler/icons-react';
import {useCallback, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router';

import {EmptyState} from '@/components/layouts/EmptyState';
import RecordsList from '@/components/layouts/RecordsList';
import {PlanCreationDrawer, PlanCreationDrawerData} from '@/components/PlanForm/PlanCreateDrawer';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {Client} from '@/store/services/clients';
import {Plan, PlanDiscipline, useListPlans} from '@/store/services/plans';

export const ClientPlansTab = ({
    client,
    isPlanDrawerOpen,
    onClosePlanDrawer,
    onOpenPlanDrawer,
    planDrawerData,
}: {
    client: Client;
    isPlanDrawerOpen: boolean;
    onClosePlanDrawer: () => void;
    onOpenPlanDrawer: (discipline: PlanDiscipline) => void;
    planDrawerData: null | PlanCreationDrawerData;
}) => {
    const navigate = useNavigate();
    const theme = useMantineTheme();

    const {
        data: plansData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isPlansLoading,
        refetch: refetchPlans,
    } = useListPlans({client_id: client.id});

    const plans = plansData?.pages?.flatMap((page) => page.records) ?? [];

    const navigateRef = useRef(navigate);
    const refetchPlansRef = useRef(refetchPlans);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    useEffect(() => {
        refetchPlansRef.current = refetchPlans;
    }, [refetchPlans]);

    const handlePlanCreated = useCallback(async (newId: string) => {
        await refetchPlansRef.current();
        navigateRef.current(`/plans/${newId}/edit`);
    }, []);

    return (
        <Stack gap="md">
            <Group justify="flex-end">
                <Menu
                    position="bottom-end"
                    shadow="md"
                    width={200}
                >
                    <Menu.Target>
                        <Button
                            radius="xl"
                            rightSection={<IconCalendarPlus size={18} />}
                            size="sm"
                        >
                            Create Plan
                        </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Item
                            leftSection={
                                <IconBowlChopsticks
                                    color={theme.colors.orange[8]}
                                    size={14}
                                />
                            }
                            onClick={() => onOpenPlanDrawer('nutrition')}
                        >
                            <Stack gap="xs">
                                <Text lh={1.2}>Nutrition Plan</Text>
                                <Text
                                    c={theme.colors.gray[6]}
                                    lh={1.2}
                                    size="xs"
                                >
                                    Create a meal plan with recipes
                                </Text>
                            </Stack>
                        </Menu.Item>
                        <Menu.Item
                            leftSection={
                                <IconTreadmill
                                    color={theme.colors.cyan[8]}
                                    size={14}
                                />
                            }
                            onClick={() => onOpenPlanDrawer('workout')}
                        >
                            <Stack gap="xs">
                                <Text lh={1.2}>Workout Plan</Text>
                                <Text
                                    c={theme.colors.gray[6]}
                                    lh={1.2}
                                    size="xs"
                                >
                                    Create a training plan with exercises
                                </Text>
                            </Stack>
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>

            <RecordsList<Plan>
                emptyState={
                    <EmptyState
                        description={`No plans found for ${client.name}. Create the first plan to kickstart progress.`}
                        title="No Plans Yet"
                    />
                }
                fetchNextPage={fetchNextPage}
                gap="md"
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isPlansLoading}
                itemKey={(item) => item.id}
                loadMoreText="Load More Plans"
                records={plans}
                renderItem={(plan) => (
                    <PlanListItem
                        key={plan.id}
                        onView={(planId) => navigate(`/plans/${planId}`)}
                        plan={plan}
                    />
                )}
            />

            <PlanCreationDrawer
                initialDiscipline={planDrawerData?.initialDiscipline}
                initialPlan={planDrawerData?.initialPlan}
                onClose={onClosePlanDrawer}
                onPlanCreated={handlePlanCreated}
                opened={isPlanDrawerOpen}
            />
        </Stack>
    );
};
