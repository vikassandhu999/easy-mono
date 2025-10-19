import {Box, Drawer, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React, {useCallback, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
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
                message: 'Failed to create plan',
                title: 'Error',
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
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    backgroundColor: 'white',
                }}
            >
                {/* Header */}
                <HeadingContainer
                    style={{
                        paddingBlock: 'var(--ce-size-md)',
                        paddingInline: 'var(--ce-size-lg)',
                        flexShrink: 0,
                    }}
                >
                    <Header
                        onBack={goBack}
                        title={!selectedDiscipline ? 'Create Plan' : 'Plan Details'}
                    />
                </HeadingContainer>

                {/* Content Area - Scrollable */}
                <Box
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                    }}
                >
                    {!selectedDiscipline ? (
                        <PaddingContainer
                            paddingX="lg"
                            paddingY="lg"
                        >
                            <Stack gap="lg">
                                {/* Introduction Section */}
                                <Stack gap="xs">
                                    <Text
                                        fw={600}
                                        size="lg"
                                    >
                                        Choose Plan Type
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        Select the type of plan you want to create for your clients.
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
                        </PaddingContainer>
                    ) : (
                        <Box style={{backgroundColor: 'white'}}>
                            <PaddingContainer
                                paddingX="lg"
                                paddingY="lg"
                            >
                                <PlanForm
                                    discipline={selectedDiscipline}
                                    onSubmit={handleSubmit}
                                    plan={{}}
                                    submitText={isCreatingPlan ? 'Creating…' : 'Create Plan'}
                                />
                            </PaddingContainer>
                        </Box>
                    )}
                </Box>
            </Box>
        </Drawer>
    );
});
