import {ActionIcon, Alert, Button, LoadingOverlay} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {IconEye, IconX} from '@tabler/icons-react';
import React from 'react';
import {Outlet, useNavigate, useParams} from 'react-router';

import {useGetPlan} from '@/store/services/plans';

import HeadingContainer from '../containers/HeaderContainer';
import PaddingContainer from '../containers/PaddingContainer';
import Header from '../layouts/Header';
import PlanNutritionEditor from './nutrition/PlanNuritionEditor';
import PlanWorkoutEditor from './workout/PlanWorkoutEditor';
const PlanEditor = () => {
    const navigate = useNavigate();
    const params = useParams();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const planId = params.planId; // passed from URL param

    const goBackToList = () => navigate(-1);

    // Fetches plan with planId
    const {
        data: plan,
        error: planError,
        isFetching: isFetchingPlan,
        isLoading: isLoadingPlan,
    } = useGetPlan(planId ?? '', {skip: !planId});

    if (planError) {
        return (
            <PaddingContainer>
                <Alert
                    color="red"
                    icon={<IconX />}
                    variant="light"
                >
                    Failed to load the plan. Please make sure you are coming from the correct URL. If the issue
                    persists, please contact us through support.
                </Alert>
            </PaddingContainer>
        );
    }

    const loadingVisible = isLoadingPlan || isFetchingPlan;

    return (
        <React.Fragment>
            {plan && (
                <>
                    <HeadingContainer withBorder={false}>
                        <LoadingOverlay visible={loadingVisible} />
                        <Header
                            actions={
                                isMobile ? (
                                    <ActionIcon
                                        aria-label="Plan details"
                                        color="brand"
                                        radius="xl"
                                        size="lg"
                                        variant="light"
                                    >
                                        <IconEye size={18} />
                                    </ActionIcon>
                                ) : (
                                    <Button
                                        leftSection={<IconEye size={16} />}
                                        radius="xl"
                                        size="sm"
                                        variant="light"
                                    >
                                        Preview
                                    </Button>
                                )
                            }
                            onBack={goBackToList}
                            title={plan?.name ?? 'Build Plan'}
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        {plan.discipline === 'workout' && <PlanWorkoutEditor plan={plan} />}
                        {plan.discipline === 'nutrition' && <PlanNutritionEditor plan={plan} />}
                    </PaddingContainer>
                </>
            )}

            <Outlet />
        </React.Fragment>
    );
};

export default PlanEditor;
