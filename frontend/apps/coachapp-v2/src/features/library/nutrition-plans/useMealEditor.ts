import {toast} from '@heroui/react';
import {useCallback, useMemo, useState} from 'react';

import type {MealItem} from '@/entities/meals/api/meals';

import {useListFoodsQuery} from '@/entities/foods/api/foods';
import {
  useDeleteMealMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} from '@/entities/meals/api/meals';
import {useListRecipesQuery} from '@/entities/recipes/api/recipes';
import {getApiErrorMessage} from '@/shared/api/shared';

export default function useMealEditor(planId: string, mealId: string, onDeleted: () => void) {
  const {data: selectedMealData, isLoading: isMealLoading} = useGetMealQuery(mealId, {skip: !mealId});
  const {data: mealItemsData} = useListMealItemsQuery(mealId, {skip: !mealId});
  const {data: foodsData} = useListFoodsQuery({limit: 250, offset: 0});
  const {data: recipesData} = useListRecipesQuery({limit: 250, offset: 0});

  const [updateMeal, {isLoading: isRenaming}] = useUpdateMealMutation();
  const [deleteMeal, {isLoading: isDeletingMeal}] = useDeleteMealMutation();
  const [updateMealItem] = useUpdateMealItemMutation();

  const meal = selectedMealData?.data;

  const sortedItems = useMemo(
    () => (mealItemsData?.data ?? []).toSorted((a, b) => a.position - b.position),
    [mealItemsData?.data],
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteMealOpen, setIsDeleteMealOpen] = useState(false);

  const foodNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of foodsData?.data ?? []) map.set(f.id, f.name);
    return map;
  }, [foodsData?.data]);

  const recipeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recipesData?.data ?? []) map.set(r.id, r.name);
    return map;
  }, [recipesData?.data]);

  const getItemName = useCallback(
    (foodId: null | string, recipeId: null | string) => {
      if (foodId) return foodNameMap.get(foodId) ?? 'Food item';
      if (recipeId) return recipeNameMap.get(recipeId) ?? 'Recipe item';
      return 'Unknown item';
    },
    [foodNameMap, recipeNameMap],
  );

  const handleRename = useCallback(
    async (name: string) => {
      try {
        await updateMeal({
          body: {name, position: meal?.position ?? 0},
          id: mealId,
          planId,
        }).unwrap();
        toast.success('Meal renamed');
        setIsRenameOpen(false);
      } catch (error) {
        toast.danger(getApiErrorMessage(error, 'Failed to rename meal'));
      }
    },
    [meal?.position, mealId, planId, updateMeal],
  );

  const handleDeleteMeal = useCallback(async () => {
    setIsDeleteMealOpen(false);
    try {
      await deleteMeal({id: mealId, planId}).unwrap();
      toast.success('Meal deleted');
      onDeleted();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete meal'));
    }
  }, [deleteMeal, mealId, onDeleted, planId]);

  const handleMoveItem = useCallback(
    async (item: MealItem, direction: 'down' | 'up') => {
      const currentIndex = sortedItems.findIndex((el) => el.id === item.id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetItem = sortedItems[targetIndex];
      if (!targetItem) return;

      try {
        await Promise.all([
          updateMealItem({
            body: {position: targetItem.position},
            id: item.id,
            mealId,
            planId,
          }).unwrap(),
          updateMealItem({
            body: {position: item.position},
            id: targetItem.id,
            mealId,
            planId,
          }).unwrap(),
        ]);
      } catch (error) {
        toast.danger(getApiErrorMessage(error, 'Failed to reorder items'));
      }
    },
    [mealId, sortedItems, planId, updateMealItem],
  );

  return {
    getItemName,
    handleDeleteMeal,
    handleMoveItem,
    handleRename,
    isDeleteMealOpen,
    isDeletingMeal,
    isMealLoading,
    isRenameOpen,
    isRenaming,
    meal,
    setIsDeleteMealOpen,
    setIsRenameOpen,
    sortedItems,
  };
}
