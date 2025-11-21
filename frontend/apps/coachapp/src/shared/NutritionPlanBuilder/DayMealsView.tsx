import {Divider, LoadingOverlay} from '@mantine/core';

import {Meal} from '@/services/nutrition_plans';
import RecipeSelectDrawer from '@/shared/RecipeSelect/RecipeSelectDrawer';

import MealCard from './MealCard';
import {MEAL_TYPES} from './mealTypes.config';
import useDayMeals from './useDayMeals';

type DayMealsViewProps = {
    currentDay: number;
    planId: null | string;
    meals: Meal[];
};

const DayMealsView = ({currentDay, planId, meals}: DayMealsViewProps) => {
    const {
        planId: effectivePlanId,
        isLoading,
        mealsByDaytime,
        isRecipeDrawerOpen,
        closeRecipeDrawer,
        handleRecipeSelect,
        handleAddRecipe,
        deleteMealItem,
    } = useDayMeals({currentDay, planId, meals});

    if (!effectivePlanId) return null;

    return (
        <>
            <LoadingOverlay visible={isLoading} />
            {isRecipeDrawerOpen && (
                <RecipeSelectDrawer
                    multiple={false}
                    onClose={closeRecipeDrawer}
                    onComplete={(selectedIds: string[]) => {
                        handleRecipeSelect(selectedIds[0]);
                    }}
                />
            )}
            {MEAL_TYPES.map((mealType, idx) => {
                const meal = mealsByDaytime[mealType.value];

                return (
                    <div key={mealType.value}>
                        <MealCard
                            meal={meal}
                            mealType={mealType}
                            onAddRecipe={handleAddRecipe}
                            onDeleteRecipe={deleteMealItem}
                        />
                        {idx < MEAL_TYPES.length - 1 && <Divider />}
                    </div>
                );
            })}
        </>
    );
};

export default DayMealsView;
