import {useEffect, useMemo, useState} from 'react';

import type {Meal} from '@/entities/meals/api/meals';
import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {NutritionPlanBuilderData} from '@/features/library/nutrition-plans/nutritionPlanBuilderTypes';

import {useListMealsQuery} from '@/entities/meals/api/meals';
import {useListPlanItemsQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {getItemsByDay} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';

export default function useNutritionPlanBuilderData(planId: string): NutritionPlanBuilderData {
  const [planItemsOverride, setPlanItemsOverride] = useState<null | PlanItem[]>(null);

  const {data: mealsData} = useListMealsQuery({planId}, {skip: !planId});
  const {data: planItemsData} = useListPlanItemsQuery(planId, {skip: !planId});

  const meals = useMemo(() => (mealsData?.data ?? []).toSorted((a, b) => a.position - b.position), [mealsData?.data]);
  const mealsById = useMemo(
    () =>
      meals.reduce<Record<string, Meal>>((acc, meal) => {
        acc[meal.id] = meal;
        return acc;
      }, {}),
    [meals],
  );

  const planItems = planItemsData?.data ?? [];
  const effectivePlanItems = planItemsOverride ?? planItems;

  useEffect(() => {
    if (planItemsOverride !== null) setPlanItemsOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planItems]);

  const itemsByDay = useMemo(() => getItemsByDay(effectivePlanItems), [effectivePlanItems]);
  const mealUsageCount = useMemo(() => new Set(effectivePlanItems.map((i) => i.meal_id)).size, [effectivePlanItems]);

  return {
    effectivePlanItems,
    itemsByDay,
    meals,
    mealsById,
    mealUsageCount,
    setPlanItemsOverride,
  };
}
