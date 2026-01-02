import {ActionIcon, Group, SegmentedControl, Stack} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {TrainingPlanList} from '@/shared/TrainingPlanList';

type PlanTabValue = 'nutrition' | 'training';

const PLAN_TABS: {label: string; value: PlanTabValue}[] = [
    {label: 'Nutrition', value: 'nutrition'},
    {label: 'Training', value: 'training'},
];

interface PlansTabProps {
    clientId: string;
    onAddPlan: () => void;
}

const PlansTab = ({clientId, onAddPlan}: PlansTabProps) => {
    const {openDrawer} = useParamsDrawer({});
    const [activePlanTab, setActivePlanTab] = useState<PlanTabValue>('nutrition');

    const handleNutritionPlanView = (nutritionPlanId: string) => {
        openDrawer(DRAWER_KEYS.NUTRITION_PLAN_BUILDER, {
            nutrition_plan_id: nutritionPlanId,
        });
    };

    const handleTrainingPlanView = (trainingPlanId: string) => {
        openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
            training_plan_id: trainingPlanId,
        });
    };

    return (
        <Stack gap="md">
            <Group
                bottom={'1px'}
                justify="space-between"
            >
                <SegmentedControl
                    data={PLAN_TABS}
                    onChange={(value) => setActivePlanTab(value as PlanTabValue)}
                    size="lg"
                    value={activePlanTab}
                />

                <ActionIcon
                    onClick={onAddPlan}
                    radius={'xl'}
                    size={'xl'}
                    style={{backgroundColor: 'var(--ce-fill-brand-strong)'}}
                >
                    <IconPlus size={24} />
                </ActionIcon>
            </Group>

            {activePlanTab === 'nutrition' && (
                <NutritionPlanList
                    clientId={clientId}
                    onPlanClick={handleNutritionPlanView}
                />
            )}
            {activePlanTab === 'training' && (
                <TrainingPlanList
                    clientId={clientId}
                    onPlanClick={handleTrainingPlanView}
                />
            )}
        </Stack>
    );
};

export default PlansTab;
