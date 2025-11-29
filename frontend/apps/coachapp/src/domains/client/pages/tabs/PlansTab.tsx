import {Button, Group, Stack} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {NutritionPlanList} from '@/shared/NutritionPlanList';
import {TrainingPlanList} from '@/shared/TrainingPlanList';

import classes from '../styles.module.css';

type PlanTabValue = 'nutrition' | 'training';

const PLAN_TABS: {id: string; label: string; value: PlanTabValue}[] = [
    {id: 'nutrition', label: 'Nutrition', value: 'nutrition'},
    {id: 'training', label: 'Training', value: 'training'},
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
        <Stack>
            <Group justify="space-between">
                {/* Plan Type Tabs */}
                <div className={classes.planTabs}>
                    {PLAN_TABS.map((tab) => (
                        <button
                            className={`${classes.planTab} ${activePlanTab === tab.value ? classes.planTabActive : ''}`}
                            key={tab.id}
                            onClick={() => setActivePlanTab(tab.value)}
                            type="button"
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <Button
                    leftSection={<IconPlus size="18" />}
                    onClick={onAddPlan}
                    radius="xl"
                    size="sm"
                    variant="solid"
                >
                    Add Plan
                </Button>
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
