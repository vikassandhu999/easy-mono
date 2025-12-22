import {LoadingOverlay} from '@mantine/core';

import {Meal} from '@/services/nutrition_plans';
import RecipeSelectDrawer from '@/shared/RecipeSelect/RecipeSelectDrawer';

import MealCard from './MealCard';
import {MEAL_TYPES} from './mealTypes.config';
import classes from './styles.module.css';
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
        <div className={classes.loadingContainer}>
            <LoadingOverlay visible={isLoading} />
            {isRecipeDrawerOpen && (
                <RecipeSelectDrawer
                    multiple={false}
                    onClose={closeRecipeDrawer}
                    onComplete={(selectedIds: string[]) => {
                        handleRecipeSelect(selectedIds[0] as string);
                    }}
                />
            )}
            <div className={classes.mealsContainer}>
                {MEAL_TYPES.map((mealType) => {
                    const meal = mealsByDaytime[mealType.value];

                    return (
                        <MealCard
                            key={mealType.value}
                            meal={meal}
                            mealType={mealType}
                            nutritionPlanId={effectivePlanId}
                            onAddRecipe={handleAddRecipe}
                            onDeleteRecipe={deleteMealItem}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default DayMealsView;
