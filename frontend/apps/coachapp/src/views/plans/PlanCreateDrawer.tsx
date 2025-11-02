import {Drawer, LoadingOverlay} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React, {useCallback, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import {CreatePlanProps, Plan, PlanDiscipline, useCreatePlan} from '@/services/plans';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import PlanDisciplineSelect from '@/shared/PlanForm/PlanDisciplineSelect';
import {PlanForm} from '@/shared/PlanForm/PlanForm';

import {PLAN_SEARCH_PARAMS, PLAN_SELECTED_DRAWER_KEY} from './constants';

const ERROR_MESSAGES = {
    CREATE_FAILED: 'Unable to create plan. Please try again.',
    INVALID_DISCIPLINE: 'Please select a valid discipline',
} as const;

const SUCCESS_MESSAGES = {
    PLAN_CREATED: 'Plan created successfully',
} as const;

export type PlanCreateDrawerView = 'create-plan' | 'select-discipline';

export type PlanCreateDrawerData = {
    initialDiscipline?: PlanDiscipline;
    initialPlan?: Partial<Plan>;
};

export const PlanCreateDrawer = React.memo(function PlanCreateDrawer() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [createPlan, {isLoading: isCreatingPlan}] = useCreatePlan();

    const goBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const selectedDiscipline = useMemo(() => {
        const disciplineParam = searchParams.get(PLAN_SEARCH_PARAMS.DISCIPLINE) as null | PlanDiscipline;
        return disciplineParam ?? undefined;
    }, [searchParams]);

    const drawerTitle = useMemo(() => {
        return selectedDiscipline ? 'Plan details' : 'Create plan';
    }, [selectedDiscipline]);

    const handleDisciplineSelect = useCallback(
        (discipline: string) => {
            if (!discipline) {
                notifications.show({
                    color: 'red',
                    message: ERROR_MESSAGES.INVALID_DISCIPLINE,
                    title: 'Error',
                });
                return;
            }

            try {
                setSearchParams(
                    (previousParams) => {
                        previousParams.set(PLAN_SEARCH_PARAMS.DISCIPLINE, discipline);
                        return previousParams;
                    },
                    {replace: true},
                );
            } catch (error) {
                console.error('Failed to set discipline:', error);
                notifications.show({
                    color: 'red',
                    message: 'Failed to select discipline. Please try again.',
                    title: 'Error',
                });
            }
        },
        [setSearchParams],
    );

    const handleSubmit = useCallback(
        async (planData: CreatePlanProps) => {
            try {
                const createdPlan = await createPlan(planData).unwrap();

                // Clear drawer-related params
                setSearchParams(
                    (previousParams) => {
                        previousParams.delete(PLAN_SEARCH_PARAMS.DISCIPLINE);
                        previousParams.delete(PLAN_SELECTED_DRAWER_KEY);
                        return previousParams;
                    },
                    {replace: true},
                );

                notifications.show({
                    color: 'green',
                    message: SUCCESS_MESSAGES.PLAN_CREATED,
                    title: 'Success',
                });

                // Navigate to plan builder
                navigate(`/plans/${createdPlan.id}/builder`);
            } catch (error) {
                console.error('Failed to create plan:', error);

                const errorMessage =
                    error && typeof error === 'object' && 'data' in error && error.data
                        ? String(error.data)
                        : ERROR_MESSAGES.CREATE_FAILED;

                notifications.show({
                    color: 'red',
                    message: errorMessage,
                    title: 'Plan creation failed',
                });
            }
        },
        [createPlan, navigate, setSearchParams],
    );

    return (
        <Drawer
            onClose={goBack}
            opened={true}
            position="right"
            size="md"
            withCloseButton={false}
        >
            <LoadingOverlay visible={isCreatingPlan} />

            <HeadingContainer>
                <Header
                    onBack={goBack}
                    title={drawerTitle}
                />
            </HeadingContainer>

            <PaddingContainer
                paddingX="md"
                paddingY="lg"
            >
                {!selectedDiscipline ? (
                    <PlanDisciplineSelect onSelect={handleDisciplineSelect} />
                ) : (
                    <PlanForm
                        discipline={selectedDiscipline}
                        onSubmit={handleSubmit}
                        plan={{}}
                        submitText="Create Plan"
                    />
                )}
            </PaddingContainer>
        </Drawer>
    );
});
