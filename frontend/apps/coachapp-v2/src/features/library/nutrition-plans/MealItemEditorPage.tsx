import {Button, Card, Input, Label, Skeleton, TextField, toast} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, Save, Trash2} from 'lucide-react';
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
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

export default function MealItemEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id: planId = '', mealId = '', itemId, sourceType, sourceId: newSourceId} = useParams({strict: false});
  const isEditMode = Boolean(itemId);
  const mealDetailUrl = `/library/nutrition-plans/${planId}/builder/meals/${mealId}/edit`;
  const backTo = isEditMode ? mealDetailUrl : `/library/nutrition-plans/${planId}/builder/meals/${mealId}/items/new`;

  const {data: mealData, isLoading: isMealLoading} = useGetMealQuery(mealId, {
    skip: !mealId,
  });
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

  const locationState = location.state as Record<string, unknown>;

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

  const toNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  };

  const handleSave = useCallback(async () => {
    try {
      if (isEditMode && itemId) {
        await updateMealItem({
          body: {
            amount: toNumber(amount),
            unit: unit.trim() || undefined,
            weight_g: toNumber(weightG),
          },
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
      navigate({to: mealDetailUrl});
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
    navigate,
    mealDetailUrl,
  ]);

  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    setIsDeleteOpen(false);
    try {
      await deleteMealItem({id: itemId, mealId, planId}).unwrap();
      toast.success('Item deleted');
      navigate({to: mealDetailUrl});
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete item'));
    }
  }, [itemId, deleteMealItem, mealId, planId, navigate, mealDetailUrl]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!meal) {
    return (
      <Card className="rounded-xl border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">Meal not found</p>
          <p className="text-sm text-muted">This meal may have been removed.</p>
          <Button
            className="min-h-11"
            onPress={() => navigate({to: `/library/nutrition-plans/${planId}/builder`})}
            variant="secondary"
          >
            Back to plan
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate({to: backTo})}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditMode ? 'Meal' : 'Choose item'}
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {resolvedName || (isEditMode ? 'Edit item' : 'Add item')}
        </h1>
        <p className="mt-1 text-sm text-muted">{meal.name}</p>
      </div>

      <div className="border-t border-separator" />

      <Card className="rounded-xl border border-separator bg-surface p-4">
        <div className="flex flex-col gap-4">
          <TextField>
            <Label className="text-sm font-medium text-foreground">Amount</Label>
            <Input
              className="min-h-11"
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              value={amount}
              variant="secondary"
            />
          </TextField>
          <TextField>
            <Label className="text-sm font-medium text-foreground">Unit</Label>
            <Input
              className="min-h-11"
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. g, ml, pieces"
              value={unit}
              variant="secondary"
            />
          </TextField>
          <TextField>
            <Label className="text-sm font-medium text-foreground">Weight (g)</Label>
            <Input
              className="min-h-11"
              inputMode="decimal"
              onChange={(e) => setWeightG(e.target.value)}
              placeholder="e.g. 100"
              value={weightG}
              variant="secondary"
            />
          </TextField>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-separator bg-background pb-4 pt-4 sm:flex-row sm:items-center">
        {isEditMode ? (
          <Button
            className="min-h-11 w-full text-muted sm:mr-auto sm:w-auto"
            isDisabled={isMutating}
            onPress={() => setIsDeleteOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating}
          onPress={() => navigate({to: backTo})}
          size="md"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating}
          onPress={handleSave}
          size="md"
          variant="primary"
        >
          <Save className="h-4 w-4" />
          {isEditMode ? 'Save changes' : 'Save item'}
        </Button>
      </div>

      {isEditMode ? (
        <ConfirmDialog
          confirmLabel="Delete"
          description="Delete this item? This cannot be undone."
          isLoading={isDeleting}
          isOpen={isDeleteOpen}
          onConfirm={handleDelete}
          onOpenChange={setIsDeleteOpen}
          title="Delete item"
        />
      ) : null}
    </div>
  );
}
