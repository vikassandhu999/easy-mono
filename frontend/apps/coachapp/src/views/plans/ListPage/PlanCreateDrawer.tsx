import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React, {useCallback, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import PlanDisciplineSelect from '@/shared/PlanForm/PlanDisciplineSelect';
import {PlanForm} from '@/shared/PlanForm/PlanForm';
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

    const handelDisciplineSelect = (discipline: string) => {
        setSearchParams(
            (prev) => {
                prev.set('discipline', discipline);
                return prev;
            },
            {replace: true},
        );
    };

    return (
        <Drawer
            onClose={goBack}
            opened={true}
            position="right"
            size="100%"
            withCloseButton={false}
        >
            <HeadingContainer>
                <Header
                    onBack={goBack}
                    title={!selectedDiscipline ? 'Create plan' : 'Plan details'}
                />
            </HeadingContainer>

            <PaddingContainer
                paddingX={'md'}
                paddingY={'lg'}
            >
                {!selectedDiscipline ? (
                    <PlanDisciplineSelect onSelect={handelDisciplineSelect} />
                ) : (
                    <PlanForm
                        discipline={selectedDiscipline}
                        onSubmit={handleSubmit}
                        plan={{}}
                        submitText={isCreatingPlan ? 'Creating plan...' : 'Create plan'}
                    />
                )}
            </PaddingContainer>
        </Drawer>
    );
});
