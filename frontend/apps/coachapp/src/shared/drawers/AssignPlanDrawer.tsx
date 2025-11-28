import {Card, Group, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconBarbell, IconSalad} from '@tabler/icons-react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';

type PlanType = 'nutrition' | 'training';

const PLAN_TYPE_CONFIG = [
    {
        id: 'nutrition',
        label: 'Nutrition Plan',
        value: 'nutrition' as PlanType,
        description: 'Assign a meal plan with recipes and nutritional guidance',
        icon: IconSalad,
        color: 'green',
        drawerKey: DRAWER_KEYS.ASSIGN_NUTRITION_PLAN,
    },
    {
        id: 'training',
        label: 'Training Plan',
        value: 'training' as PlanType,
        description: 'Assign a workout program with exercises and schedules',
        icon: IconBarbell,
        color: 'blue',
        drawerKey: DRAWER_KEYS.ASSIGN_TRAINING_PLAN,
    },
];

const AssignPlanDrawer = () => {
    const {openDrawer, closeDrawer, getDrawerParams} = useParamsDrawer({});
    const {client_id} = getDrawerParams();

    const handleSelect = (planType: PlanType) => {
        const config = PLAN_TYPE_CONFIG.find((item) => item.value === planType);
        if (config?.drawerKey) {
            openDrawer(config.drawerKey, {client_id});
        }
    };

    return (
        <AutoDrawer
            content={
                <Stack gap="md">
                    {PLAN_TYPE_CONFIG.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Card
                                key={item.id}
                                onClick={() => handleSelect(item.value)}
                                padding="lg"
                                radius="xl"
                                style={{cursor: 'pointer'}}
                                w="100%"
                                withBorder
                            >
                                <Group wrap="nowrap">
                                    <ThemeIcon
                                        color={item.color}
                                        radius="md"
                                        size="xl"
                                        variant="light"
                                    >
                                        <Icon size={24} />
                                    </ThemeIcon>
                                    <div style={{flex: 1}}>
                                        <Text
                                            fw={500}
                                            size="md"
                                        >
                                            {item.label}
                                        </Text>
                                        <Text
                                            c="dimmed"
                                            size="sm"
                                        >
                                            {item.description}
                                        </Text>
                                    </div>
                                </Group>
                            </Card>
                        );
                    })}
                </Stack>
            }
            onClose={closeDrawer}
            title="Add Plan"
        />
    );
};

export default AssignPlanDrawer;
