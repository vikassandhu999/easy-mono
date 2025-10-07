import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React, {useCallback, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import {CreatePlanProps, Plan, PlanDiscipline} from '@/api/plans';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '@/components/layouts/Header';
import PlanDisciplineSelect from '@/components/PlanForm/PlanDisciplineSelect';
import {PlanForm} from '@/components/PlanForm/PlanForm';
import {useCreatePlan} from '@/store/services/plans';

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
            withCloseButton={false}
        >
            {!selectedDiscipline ? (
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={goBack}
                            title="Create plan"
                        />
                    </HeadingContainer>

                    <div style={{flex: 1, overflow: 'auto'}}>
                        <PaddingContainer>
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
                        </PaddingContainer>
                    </div>
                </PagePaper>
            ) : (
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={goBack}
                            title="Create plan"
                        />
                    </HeadingContainer>

                    <PaddingContainer>
                        <PlanForm
                            discipline={selectedDiscipline}
                            onSubmit={handleSubmit}
                            plan={{}}
                            submitText={isCreatingPlan ? 'Creating…' : 'Create plan'}
                        />
                    </PaddingContainer>
                </PagePaper>
            )}
        </Drawer>
    );
});
