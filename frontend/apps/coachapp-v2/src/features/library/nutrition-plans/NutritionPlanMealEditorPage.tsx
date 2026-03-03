import {Button, Card, Input, Label, Skeleton, TextField, toast} from '@heroui/react';
import {ArrowLeft, Plus, UtensilsCrossed} from 'lucide-react';
import {Fragment, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useListFoodsQuery} from '@/entities/foods/api/foods';
import {
  useCreateMealItemMutation,
  useDeleteMealItemMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} from '@/entities/meals/api/meals';
import {useListPlanItemsQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {useListRecipesQuery} from '@/entities/recipes/api/recipes';
import {getReturnTo} from '@/features/library/libraryFormShared';
import AddMealItemForm from '@/features/library/nutrition-plans/AddMealItemForm';
import MealItemRow from '@/features/library/nutrition-plans/MealItemRow';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

export default function NutritionPlanMealEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, mealId} = useParams();
  const planId = id ?? '';
  const editingMealId = mealId ?? '';
  const returnTo = getReturnTo(location, `/library/nutrition-plans/${planId}/builder`);

  const [mealNameDraft, setMealNameDraft] = useState('');
  const [itemToDelete, setItemToDelete] = useState<null | string>(null);

  const {data: selectedMealData, isLoading: isMealLoading} = useGetMealQuery(editingMealId, {skip: !editingMealId});
  const {data: mealItemsData} = useListMealItemsQuery(editingMealId, {
    skip: !editingMealId,
  });
  const {data: foodsData} = useListFoodsQuery({limit: 100, offset: 0});
  const {data: recipesData} = useListRecipesQuery({limit: 100, offset: 0});
  const {data: planItemsData} = useListPlanItemsQuery(planId, {
    skip: !planId,
  });

  const [updateMeal, {isLoading: isUpdatingMeal}] = useUpdateMealMutation();
  const [createMealItem, {isLoading: isCreatingMealItem}] = useCreateMealItemMutation();
  const [updateMealItem, {isLoading: isUpdatingMealItem}] = useUpdateMealItemMutation();
  const [deleteMealItem, {isLoading: isDeletingMealItem}] = useDeleteMealItemMutation();

  const meal = selectedMealData?.data;
  const mealItems = mealItemsData?.data ?? [];
  const foods = (foodsData?.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }));
  const recipes = (recipesData?.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
  }));
  const mealUsageCount = (planItemsData?.data ?? []).filter((item) => item.meal_id === editingMealId).length;
  const isLoading = isUpdatingMeal || isCreatingMealItem || isUpdatingMealItem || isDeletingMealItem;

  const foodNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of foods) map.set(f.id, f.name);
    return map;
  }, [foods]);

  const recipeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recipes) map.set(r.id, r.name);
    return map;
  }, [recipes]);

  const getItemName = (foodId: null | string, recipeId: null | string) => {
    if (foodId) return foodNameMap.get(foodId) ?? 'Food item';
    if (recipeId) return recipeNameMap.get(recipeId) ?? 'Recipe item';
    return 'Unknown item';
  };

  useEffect(() => {
    setMealNameDraft(meal?.name ?? '');
  }, [meal?.name]);

  const handleUpdateName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mealNameDraft.trim()) return;
    try {
      await updateMeal({
        body: {name: mealNameDraft.trim(), position: meal?.position ?? 0},
        id: editingMealId,
        planId,
      }).unwrap();
      toast.success('Meal updated.');
    } catch {
      toast.danger('Unable to update meal. Please try again.');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete;
    setItemToDelete(null);
    try {
      await deleteMealItem({id, mealId: editingMealId, planId}).unwrap();
      toast.success('Meal item deleted.');
    } catch {
      toast.danger('Unable to delete meal item. Please try again.');
    }
  };

  const handleUpdateItem = async (itemId: string, body: {amount?: number; unit?: string; weight_g?: number}) => {
    try {
      await updateMealItem({
        body,
        id: itemId,
        mealId: editingMealId,
        planId,
      }).unwrap();
      toast.success('Meal item updated.');
    } catch {
      toast.danger('Unable to update meal item. Please try again.');
    }
  };

  const handleAddItem = async (body: {
    amount?: number;
    food_id?: string;
    recipe_id?: string;
    unit?: string;
    weight_g?: number;
  }) => {
    try {
      await createMealItem({
        body: {...body, position: mealItems.length},
        mealId: editingMealId,
        planId,
      }).unwrap();
      toast.success('Meal item added.');
    } catch {
      toast.danger('Unable to add meal item. Please try again.');
    }
  };

  if (isMealLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!meal) {
    return (
      <Card className="border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <UtensilsCrossed className="h-7 w-7 text-muted" />
          </div>
          <p className="text-lg font-semibold text-foreground">Meal not found</p>
          <p className="text-sm text-muted">This meal may have been removed.</p>
          <Button
            className="min-h-11"
            onPress={() => navigate(returnTo)}
            variant="secondary"
          >
            Back to builder
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Builder
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{meal.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Used in {mealUsageCount} assignment{mealUsageCount === 1 ? '' : 's'} ·{' '}
          {mealUsageCount > 1 ? 'Changes update every linked assignment' : 'Global meal editing'}
        </p>
      </div>

      <div className="border-t border-separator" />

      {/* Meal name form */}
      <form
        className="flex items-end gap-2"
        onSubmit={handleUpdateName}
      >
        <TextField className="min-w-0 flex-1">
          <Label className="text-xs font-medium text-muted">Meal name</Label>
          <Input
            className="min-h-11"
            onChange={(e) => setMealNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.form?.requestSubmit();
            }}
            placeholder="Meal name"
            value={mealNameDraft}
            variant="secondary"
          />
        </TextField>
        <Button
          className="min-h-11 shrink-0"
          isDisabled={!mealNameDraft.trim() || isLoading}
          size="md"
          type="submit"
          variant="primary"
        >
          Save
        </Button>
      </form>

      {/* Items section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">Items</p>
          <p className="text-sm text-muted">
            {mealItems.length} item{mealItems.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {mealItems.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <Plus className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No items yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Add food or recipe items to build this meal.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {mealItems.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 ? <div className="border-t border-separator" /> : null}
              <MealItemRow
                isLoading={isLoading}
                item={item}
                name={getItemName(item.food_id, item.recipe_id)}
                onDelete={handleDeleteItem}
                onUpdate={handleUpdateItem}
              />
            </Fragment>
          ))}
        </Card>
      )}

      {/* Add item form */}
      <AddMealItemForm
        foods={foods}
        isLoading={isLoading}
        onSubmit={handleAddItem}
        recipes={recipes}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this meal item? This cannot be undone."
        isLoading={isDeletingMealItem}
        isOpen={itemToDelete !== null}
        onConfirm={confirmDeleteItem}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
        title="Delete meal item"
      />
    </div>
  );
}
