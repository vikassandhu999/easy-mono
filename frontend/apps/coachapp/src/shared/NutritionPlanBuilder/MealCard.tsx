import {ActionIcon, Card, Group, Stack, Text} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

import {Meal, MealDaytime} from '@/services/nutrition_plans';

import MealRecipeItem from './MealRecipeItem';

type MealCardProps = {
    mealType: {
        label: string;
        value: MealDaytime;
    };
    meal: Meal | undefined;
    onAddRecipe: (mealId: string | undefined, daytime: MealDaytime, label: string) => void;
    onDeleteRecipe: (itemId: string, mealId: string) => void;
    nutritionPlanId: string;
};

export const MealCard = ({mealType, meal, onAddRecipe, onDeleteRecipe, nutritionPlanId}: MealCardProps) => {
    const hasRecipes = !!meal && meal.meal_items.length > 0;

    return (
        <Card radius="lg">
            <Stack gap="md">
                {/* Meal Header */}
                <Group justify="space-between">
                    <Text
                        c="dimmed"
                        fw="bold"
                        size="xl"
                    >
                        {mealType.label}
                    </Text>
                    <ActionIcon
                        onClick={() => {
                            onAddRecipe(meal?.id, mealType.value, mealType.label);
                        }}
                        radius="lg"
                        variant="subtle"
                    >
                        <IconPlus />
                    </ActionIcon>
                </Group>

                {/* Meal Items (Recipes) */}
                {hasRecipes && (
                    <Stack gap="xs">
                        {meal!.meal_items.map((item) => (
                            <MealRecipeItem
                                item={item}
                                key={item.id}
                                nutritionPlanId={nutritionPlanId}
                                onDelete={() => {
                                    onDeleteRecipe(item.id, meal!.id);
                                }}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
};

export default MealCard;
