import {humanizeError} from '@easy/error-parser';
import {useMemo, useState} from 'react';

import {useCreateMealItem, useDeleteMealItem} from '@/services/meal_items';
import {MealDaytime, useCreateMeal} from '@/services/meals';
import {Meal} from '@/services/nutrition_plans';
import {notifyError} from '@/utils/notification';

export type UseDayMealsArgs = {
    currentDay: number;
    planId: null | string;
    meals: Meal[];
};

const useDayMeals = ({currentDay, planId, meals}: UseDayMealsArgs) => {
    const [localLoading, setLocalLoading] = useState<boolean>(false);
    const [isRecipeDrawerOpen, setIsRecipeDrawerOpen] = useState(false);
    const [selectedMealId, setSelectedMealId] = useState<null | string>(null);

    const [deleteMealItemMutation] = useDeleteMealItem();
    const [createMealItemMutation] = useCreateMealItem();
    const [createMealMutation] = useCreateMeal();

    const mealsByDaytime = useMemo(() => {
        const grouped: Record<MealDaytime, Meal | undefined> = {
            early_morning: undefined,
            breakfast: undefined,
            lunch: undefined,
            dinner: undefined,
            pre_workout: undefined,
            post_workout: undefined,
            snack: undefined,
        };

        meals
            .filter((meal) => meal.day_number === currentDay)
            .forEach((meal) => {
                grouped[meal.daytime] = meal;
            });

        return grouped;
    }, [meals, currentDay]);

    const deleteMealItem = async (itemId: string, mealId: string) => {
        if (!planId) return;

        try {
            await deleteMealItemMutation({
                id: itemId,
                meal_id: mealId,
                nutrition_plan_id: planId,
            });
        } catch (e) {
            const errMsg = humanizeError(e);
            notifyError(errMsg);
        } finally {
            setLocalLoading(false);
        }
    };

    const openRecipeDrawer = (mealId: string) => {
        setSelectedMealId(mealId);
        setIsRecipeDrawerOpen(true);
    };

    const closeRecipeDrawer = () => {
        setIsRecipeDrawerOpen(false);
        setSelectedMealId(null);
    };

    const handleAddRecipe = async (mealId: string | undefined, daytime: MealDaytime, label: string) => {
        if (!planId) return;

        // If meal exists, just open the drawer
        if (mealId) {
            openRecipeDrawer(mealId);
            return;
        }

        // Create meal first
        setLocalLoading(true);
        try {
            const result = await createMealMutation({
                nutrition_plan_id: planId,
                day_number: currentDay,
                daytime,
                label,
                position : 1
            });

            // Open drawer with the newly created meal ID
            if (result?.data?.id) {
                openRecipeDrawer(result.data.id);
            }
        } catch (e) {
            const errMsg = humanizeError(e);
            notifyError(errMsg);
        } finally {
            setLocalLoading(false);
        }
    };

    const handleRecipeSelect = async (selectedId: string) => {
        if (!planId || !selectedMealId || !selectedId) return;

        setLocalLoading(true);

        try {
            await createMealItemMutation({
                meal_id: selectedMealId,
                recipe_id: selectedId,
                servings: 1,
                position: 0,
                nutrition_plan_id: planId,
            });
            closeRecipeDrawer();
        } catch (e) {
            const errMsg = humanizeError(e);
            notifyError(errMsg);
        } finally {
            setLocalLoading(false);
        }
    };

    return {
        planId,
        isLoading: localLoading,
        mealsByDaytime,
        isRecipeDrawerOpen,
        openRecipeDrawer,
        closeRecipeDrawer,
        handleRecipeSelect,
        handleAddRecipe,
        deleteMealItem,
    };
};

export default useDayMeals;
