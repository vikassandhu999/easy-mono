import {toast} from '@heroui/react';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {useListFoodsQuery} from '@/entities/foods/api/foods';
import {
  useCreateMealItemMutation,
  useDeleteMealItemMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useUpdateMealItemMutation,
} from '@/entities/meals/api/meals';
import {useListRecipesQuery} from '@/entities/recipes/api/recipes';
import {getApiErrorMessage} from '@/shared/api/shared';

const toNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return isNaN(num) ? undefined : num;
};

type UseMealItemEditorParams = {
  itemId?: string;
  locationState: Record<string, unknown>;
  mealId: string;
  newSourceId?: string;
  onSaved: () => void;
  planId: string;
  sourceType?: string;
};

export default function useMealItemEditor({
  itemId,
  locationState,
  mealId,
  newSourceId,
  onSaved,
  planId,
  sourceType,
}: UseMealItemEditorParams) {
  const isEditMode = Boolean(itemId);

  const {data: mealData, isLoading: isMealLoading} = useGetMealQuery(mealId, {skip: !mealId});
  const {data: mealItemsData, isLoading: isItemsLoading} = useListMealItemsQuery(mealId, {skip: !mealId});
  const {data: foodsData} = useListFoodsQuery({limit: 250, offset: 0});
  const {data: recipesData} = useListRecipesQuery({limit: 250, offset: 0});

  const [createMealItem, {isLoading: isCreating}] = useCreateMealItemMutation();
  const [updateMealItem, {isLoading: isUpdating}] = useUpdateMealItemMutation();
  const [deleteMealItem, {isLoading: isDeleting}] = useDeleteMealItemMutation();

  const meal = mealData?.data;
  const mealItems = useMemo(() => mealItemsData?.data ?? [], [mealItemsData?.data]);
  const existingItem = useMemo(
    () => (itemId ? mealItems.find((mi) => mi.id === itemId) : undefined),
    [itemId, mealItems],
  );
  const isLoading = isMealLoading || (isEditMode && isItemsLoading);

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

  const resolvedName = useMemo(() => {
    if (!isEditMode && locationState?.itemName) return locationState.itemName as string;
    if (existingItem?.food_id) return foodNameMap.get(existingItem.food_id) ?? 'Food item';
    if (existingItem?.recipe_id) return recipeNameMap.get(existingItem.recipe_id) ?? 'Recipe item';
    return '';
  }, [isEditMode, locationState?.itemName, existingItem, foodNameMap, recipeNameMap]);

  const [initialized, setInitialized] = useState(!isEditMode);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [weightG, setWeightG] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialized || !existingItem) return;
    setAmount(existingItem.amount == null ? '' : String(existingItem.amount));
    setUnit(existingItem.unit ?? '');
    setWeightG(existingItem.weight_g == null ? '' : String(existingItem.weight_g));
    setInitialized(true);
  }, [initialized, existingItem]);

  const nextPosition = useMemo(() => mealItems.length + 1, [mealItems.length]);
  const isMutating = isCreating || isUpdating || isDeleting;

  const handleSave = useCallback(async () => {
    try {
      if (isEditMode && itemId) {
        await updateMealItem({
          body: {amount: toNumber(amount), unit: unit.trim() || undefined, weight_g: toNumber(weightG)},
          id: itemId,
          mealId,
          planId,
        }).unwrap();
        toast.success('Item updated');
      } else {
        await createMealItem({
          body: {
            amount: toNumber(amount),
            food_id: sourceType === 'food' ? newSourceId : undefined,
            position: nextPosition,
            recipe_id: sourceType === 'recipe' ? newSourceId : undefined,
            unit: unit.trim() || undefined,
            weight_g: toNumber(weightG),
          },
          mealId,
          planId,
        }).unwrap();
        toast.success('Item added');
      }
      onSaved();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, isEditMode ? 'Failed to update item' : 'Failed to add item'));
    }
  }, [
    amount,
    unit,
    weightG,
    isEditMode,
    itemId,
    sourceType,
    newSourceId,
    mealId,
    planId,
    nextPosition,
    updateMealItem,
    createMealItem,
    onSaved,
  ]);

  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    setIsDeleteOpen(false);
    try {
      await deleteMealItem({id: itemId, mealId, planId}).unwrap();
      toast.success('Item deleted');
      onSaved();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete item'));
    }
  }, [itemId, deleteMealItem, mealId, planId, onSaved]);

  return {
    amount,
    handleDelete,
    handleSave,
    isDeleteOpen,
    isDeleting,
    isEditMode,
    isLoading,
    isMutating,
    meal,
    resolvedName,
    setAmount,
    setIsDeleteOpen,
    setUnit,
    setWeightG,
    unit,
    weightG,
  };
}
