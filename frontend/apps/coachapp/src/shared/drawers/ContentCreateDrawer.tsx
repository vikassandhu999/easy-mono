import {Card, Group, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconApple, IconBarbell, IconChefHat, IconRun} from '@tabler/icons-react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';

type ContentType = 'exercise' | 'meal' | 'recipe' | 'workout';

const CONTENT_CONFIG = [
    {
        id: 'exercise',
        label: 'Create Exercise',
        value: 'exercise' as ContentType,
        description: 'A single movement or activity (e.g., push-ups, squats)',
        icon: IconBarbell,
        color: 'blue',
        drawerKey: DRAWER_KEYS.EXERCISE_CREATE,
    },
    {
        id: 'workout',
        label: 'Create Workout',
        value: 'workout' as ContentType,
        description: 'A collection of exercises for a training session',
        icon: IconRun,
        color: 'grape',
        drawerKey: DRAWER_KEYS.WORKOUT_CREATE,
    },
    {
        id: 'nutrition-plan',
        label: 'Create Nutrition Plan',
        value: 'nutrition_plan' as ContentType,
        description: 'A reusable template which can contain recipes, foods.',
        icon: IconChefHat,
        color: 'orange',
        drawerKey: DRAWER_KEYS.NUTRITION_PLAN_CREATE,
    },
    {
        id: 'recipe',
        label: 'Create Recipe',
        value: 'recipe' as ContentType,
        description: 'A single dish with ingredients and nutritional information',
        icon: IconApple,
        color: 'green',
        drawerKey: DRAWER_KEYS.RECIPE_CREATE,
    },
];

const ContentCreateDrawer = () => {
    const {openDrawer, closeDrawer} = useParamsDrawer({});

    const handleSelect = (contentType: ContentType) => {
        const config = CONTENT_CONFIG.find((item) => item.value === contentType);
        if (config?.drawerKey) {
            openDrawer(config.drawerKey);
        }
    };

    return (
        <AutoDrawer
            content={
                <Stack gap="md">
                    {CONTENT_CONFIG.map((item) => {
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
            title="Create Content"
        />
    );
};

export default ContentCreateDrawer;
