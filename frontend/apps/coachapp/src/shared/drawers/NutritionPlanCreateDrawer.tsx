import {Button} from '@mantine/core';
import {useRef} from 'react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useCreateNutritionPlan} from '@/services/nutrition_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import NutritionPlanForm, {NutritionPlanFormHandle} from '@/shared/NutritionPlanForm';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess} from '@/utils/notification';

const NutritionPlanCreateDrawer = () => {
    const {closeDrawer, openDrawer} = useParamsDrawer({});
    const nutritionPlanFormRef = useRef<NutritionPlanFormHandle<'create'>>(null);
    const [createPlan, {isLoading}] = useCreateNutritionPlan();

    const handleSubmit = async () => {
        await nutritionPlanFormRef.current?.submit();
    };

    return (
        <AutoDrawer
            actions={
                <Button
                    color="green"
                    fullWidth
                    loading={isLoading}
                    onClick={handleSubmit}
                    radius="xl"
                    size="sm"
                    variant="solid"
                >
                    Save
                </Button>
            }
            content={
                <NutritionPlanForm
                    onSubmit={async (values) => {
                        try {
                            const plan = await createPlan(values).unwrap();

                            notifySuccess('Nutrition plan created successfully');

                            closeDrawer();
                            openDrawer(DRAWER_KEYS.NUTRITION_PLAN_BUILDER, {
                                nutrition_plan_id: plan.id,
                            });
                        } catch (error) {
                            const err_message = new APIErrorParser(error).humanize();
                            notifyError(err_message);
                        }
                    }}
                    ref={nutritionPlanFormRef}
                />
            }
            onClose={closeDrawer}
            title="Add Nutrition Plan"
        />
    );
};

export default NutritionPlanCreateDrawer;
