import {toast} from '@heroui/react';
import {useCallback, useMemo, useState} from 'react';

import {useCreateMealMutation, useListMealsQuery} from '@/entities/meals/api/meals';
import {useCreatePlanItemMutation} from '@/entities/nutritionPlans/api/nutritionPlans';
import {MEAL_TYPES, toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import {getApiErrorMessage} from '@/shared/api/shared';

type UseAddMealParams = {
  day: string;
  onSaved: () => void;
  planId: string;
};

export default function useAddMeal({day, onSaved, planId}: UseAddMealParams) {
  const {data: mealsData, isLoading: isMealsLoading} = useListMealsQuery({planId}, {skip: !planId});
  const [createMeal] = useCreateMealMutation();
  const [createPlanItem] = useCreatePlanItemMutation();

  const meals = useMemo(() => (mealsData?.data ?? []).toSorted((a, b) => a.position - b.position), [mealsData?.data]);

  const [tab, setTab] = useState<'existing' | 'new'>('new');
  const [mealName, setMealName] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<string>(MEAL_TYPES[0]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredMeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? meals.filter((m) => m.name.toLowerCase().includes(q)) : meals;
  }, [meals, search]);

  const handleCreateMeal = useCallback(async () => {
    if (!mealName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const res = await createMeal({
        body: {name: mealName.trim(), position: meals.length},
        planId,
      }).unwrap();
      await createPlanItem({
        body: {day, meal_id: res.data.id, meal_type: selectedMealType},
        planId,
      }).unwrap();
      toast.success(`Meal added to ${toSentenceLabel(day)}`);
      onSaved();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to add meal'));
    } finally {
      setIsSaving(false);
    }
  }, [mealName, isSaving, createMeal, meals.length, planId, createPlanItem, day, selectedMealType, onSaved]);

  const handleLinkMeal = useCallback(
    async (mealId: string) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await createPlanItem({
          body: {day, meal_id: mealId, meal_type: selectedMealType},
          planId,
        }).unwrap();
        toast.success(`Meal assigned to ${toSentenceLabel(day)}`);
        onSaved();
      } catch (error) {
        toast.danger(getApiErrorMessage(error, 'Failed to assign meal'));
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, createPlanItem, day, selectedMealType, planId, onSaved],
  );

  return {
    filteredMeals,
    handleCreateMeal,
    handleLinkMeal,
    isMealsLoading,
    isSaving,
    mealName,
    search,
    selectedMealType,
    setMealName,
    setSearch,
    setSelectedMealType,
    setTab,
    tab,
  };
}
