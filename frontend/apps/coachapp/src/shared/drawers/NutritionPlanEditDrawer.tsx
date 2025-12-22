import {humanizeError} from '@easy/error-parser';
import {Button} from '@mantine/core';
import {useRef} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetNutritionPlan, useUpdateNutritionPlan} from '@/services/nutrition_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import NutritionPlanForm, {NutritionPlanFormHandle} from '@/shared/NutritionPlanForm';
import {notifyError} from '@/utils/notification';

import {DrawerErrorState, DrawerLoadingState} from './shared';

const NutritionPlanEditDrawer = () => {
    const {closeDrawer, getDrawerParams} = useParamsDrawer({});
    const nutritionPlanFormRef = useRef<NutritionPlanFormHandle<'update'>>(null);
    const [updatePlan, {isLoading: isUpdating}] = useUpdateNutritionPlan();

    const params = getDrawerParams();
    const planId = params.nutrition_plan_id;

    const {
        data: plan,
        isLoading: isFetching,
        error,
        refetch,
    } = useGetNutritionPlan(planId ?? '', {
        skip: !planId,
    });

    const handleSubmit = async () => {
        await nutritionPlanFormRef.current?.submit();
    };

    if (!planId) {
        return (
            <AutoDrawer
                actions={null}
                content={
                    <DrawerErrorState
                        message="No nutrition plan ID provided."
                        title="Missing Plan ID"
                    />
                }
                onClose={closeDrawer}
                title="Error"
            />
        );
    }

    if (isFetching) {
        return (
            <AutoDrawer
                actions={null}
                content={<DrawerLoadingState message="Loading nutrition plan..." />}
                onClose={closeDrawer}
                title="Loading..."
            />
        );
    }

    if (error || !plan) {
        return (
            <AutoDrawer
                actions={null}
                content={
                    <DrawerErrorState
                        message="Failed to load nutrition plan. Please try again."
                        onRetry={refetch}
                        title="Error Loading Plan"
                    />
                }
                onClose={closeDrawer}
                title="Error"
            />
        );
    }

    return (
        <AutoDrawer
            actions={
                <Button
                    color="green"
                    fullWidth
                    loading={isUpdating}
                    onClick={handleSubmit}
                    radius="xl"
                    size="sm"
                    variant="solid"
                >
                    Update
                </Button>
            }
            content={
                <NutritionPlanForm
                    initialValues={{
                        name: plan.name,
                        description: plan.description,
                        status: plan.status,
                    }}
                    onSubmit={async (values) => {
                        try {
                            await updatePlan(values).unwrap();

                            closeDrawer();
                        } catch (error) {
                            const errMsg = humanizeError(error);
                            notifyError(errMsg);
                        }
                    }}
                    planId={planId}
                    ref={nutritionPlanFormRef}
                />
            }
            onClose={closeDrawer}
            title="Edit Nutrition Plan"
        />
    );
};

export default NutritionPlanEditDrawer;
