import {Container, Drawer, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React, {useCallback, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import Header from '@/components/layouts/Header';
import PlanDisciplineSelect from '@/components/PlanForm/PlanDisciplineSelect';
import {PlanForm} from '@/components/PlanForm/PlanForm';
import {CreatePlanProps, Plan, PlanDiscipline, useCreatePlan} from '@/store/services/plans';

export type PlanCreateDrawerView = 'create-plan' | 'select-discipline';

export type PlanCreateDrawerData = {
    initialDiscipline?: PlanDiscipline;
    initialPlan?: Partial<Plan>;
};

export const PlanCreateDrawer = React.memo(function CreateDrawer() {
    const navigate = useNavigate();
    const goBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);
    const [searchParams, setSearchParams] = useSearchParams();

    const [createPlan, {isLoading: isCreatingPlan}] = useCreatePlan();

    const {selectedDiscipline} = useMemo(() => {
        const selectedDiscipline = searchParams.get('discipline') as null | PlanDiscipline;

        return {
            selectedDiscipline: selectedDiscipline ?? undefined,
        };
    }, [searchParams]);

    const handleSubmit = async (values: CreatePlanProps) => {
        try {
            const plan = await createPlan(values).unwrap();
            setSearchParams(
                (prev) => {
                    prev.delete('discipline');
                    prev.delete('selected_drawer');
                    return prev;
                },
                {replace: true},
            );

            navigate(`/plans/${plan.id}/builder`);
        } catch (error) {
            console.error('Failed to create plan', error);
            notifications.show({
                color: 'red',
                message: 'Unable to create plan. Please try again.',
                title: 'Plan creation failed',
            });
        }
    };

    return (
        <Drawer
            onClose={goBack}
            opened={true}
            position="right"
            size="100%"
            styles={{
                body: {
                    padding: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
            withCloseButton={false}
        >
            <Stack
                align="center"
                gap="md"
                h="100%"
            >
                {/* Header - Constrained Width */}
                <Container
                    p="md"
                    size={560}
                    w="100%"
                >
                    <Header
                        onBack={goBack}
                        title={!selectedDiscipline ? 'Create plan' : 'Plan details'}
                    />
                </Container>

                {/* Content Area - Scrollable, Constrained Width */}
                <Container
                    bg="gray.0"
                    p="lg"
                    size={560}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                    }}
                    w="100%"
                >
                    {!selectedDiscipline ? (
                        <Stack gap="lg">
                            {/* Introduction Section */}
                            <Stack gap="sm">
                                <Text
                                    fw={600}
                                    size="lg"
                                >
                                    Choose plan type
                                </Text>
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    Select a plan category to tailor the setup to your client's goals.
                                </Text>
                            </Stack>

                            {/* Discipline Selection */}
                            <PlanDisciplineSelect
                                onSelect={(discipline) =>
                                    setSearchParams(
                                        (prev) => {
                                            prev.set('discipline', discipline);
                                            return prev;
                                        },
                                        {replace: true},
                                    )
                                }
                            />
                        </Stack>
                    ) : (
                        <PlanForm
                            discipline={selectedDiscipline}
                            onSubmit={handleSubmit}
                            plan={{}}
                            submitText={isCreatingPlan ? 'Creating plan...' : 'Create plan'}
                        />
                    )}
                </Container>
            </Stack>
        </Drawer>
    );
});
