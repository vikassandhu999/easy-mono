import {Alert, LoadingOverlay} from '@mantine/core';
import {IconX} from '@tabler/icons-react';
import React from 'react';
import {Outlet, useNavigate, useParams} from 'react-router';

import {useGetPlan} from '@/services/plans';

import HeadingContainer from '../containers/HeaderContainer';
import PaddingContainer from '../containers/PaddingContainer';
import Header from '../layouts/Header';
import PlanNutritionEditor from './nutrition/PlanNuritionEditor';
import PlanWorkoutEditor from './workout/PlanWorkoutEditor';
const PlanEditor = () => {
    const navigate = useNavigate();
    const params = useParams();

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
