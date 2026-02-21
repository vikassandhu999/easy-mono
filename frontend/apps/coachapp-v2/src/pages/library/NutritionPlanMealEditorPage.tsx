import {Button, Card, Input, Label, TextField, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useListFoodsQuery} from '@/api/foods';
import {
  useCreateMealItemMutation,
  useDeleteMealItemMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} from '@/api/meals';
import {useListPlanItemsQuery} from '@/api/nutritionPlans';
import {useListRecipesQuery} from '@/api/recipes';
import AddMealItemForm from '@/components/AddMealItemForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import MealItemRow from '@/components/MealItemRow';
import {getReturnTo} from '@/pages/library/libraryFormShared';

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
  const {data: mealItemsData} = useListMealItemsQuery(editingMealId, {skip: !editingMealId});
  const {data: foodsData} = useListFoodsQuery({limit: 100, offset: 0});
  const {data: recipesData} = useListRecipesQuery({limit: 100, offset: 0});
  const {data: planItemsData} = useListPlanItemsQuery(planId, {skip: !planId});

  const [updateMeal, {isLoading: isUpdatingMeal}] = useUpdateMealMutation();
  const [createMealItem, {isLoading: isCreatingMealItem}] = useCreateMealItemMutation();
  const [updateMealItem, {isLoading: isUpdatingMealItem}] = useUpdateMealItemMutation();
  const [deleteMealItem, {isLoading: isDeletingMealItem}] = useDeleteMealItemMutation();

  const meal = selectedMealData?.data;
  const mealItems = mealItemsData?.data ?? [];
  const foods = (foodsData?.data ?? []).map((f) => ({id: f.id, name: f.name}));
  const recipes = (recipesData?.data ?? []).map((r) => ({id: r.id, name: r.name}));
  const mealUsageCount = (planItemsData?.data ?? []).filter((item) => item.meal_id === editingMealId).length;
  const isLoading = isUpdatingMeal || isCreatingMealItem || isUpdatingMealItem || isDeletingMealItem;

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
      await updateMealItem({body, id: itemId, mealId: editingMealId, planId}).unwrap();
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
      await createMealItem({body: {...body, position: mealItems.length}, mealId: editingMealId, planId}).unwrap();
      toast.success('Meal item added.');
    } catch {
      toast.danger('Unable to add meal item. Please try again.');
    }
  };

  if (isMealLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading meal...</p>
      </Card>
    );
  }

  if (!meal) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="font-semibold text-foreground">Meal not found.</p>
        <Button
          className="mt-4 min-h-11"
          onPress={() => navigate(returnTo)}
          variant="outline"
        >
          Back to builder
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          className="min-h-11 w-fit gap-2 px-2"
          onPress={() => navigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Button>
        <h1 className="text-2xl font-semibold md:text-3xl">Edit meal</h1>
        <p className="text-sm text-muted">Global meal changes apply to all linked assignments.</p>
      </div>

      <Card className="border border-separator bg-background p-4">
        <p className="text-sm font-medium text-foreground">
          Used in {mealUsageCount} day assignment{mealUsageCount === 1 ? '' : 's'}.
        </p>
        <p className="mt-1 text-sm text-muted">
          {mealUsageCount > 1
            ? 'Changes here update every linked assignment. Use Duplicate for this day in the planner when you need local changes.'
            : 'Changes here apply to this meal across the planner.'}
        </p>
      </Card>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleUpdateName}
        >
          <TextField className="flex-1">
            <Label className="text-sm font-medium text-foreground">Meal name</Label>
            <Input
              className="min-h-11"
              onChange={(e) => setMealNameDraft(e.target.value)}
              placeholder="Meal name"
              value={mealNameDraft}
              variant="secondary"
            />
          </TextField>
          <Button
            className="min-h-11"
            isDisabled={!mealNameDraft.trim() || isLoading}
            size="md"
            type="submit"
            variant="primary"
          >
            Save meal
          </Button>
        </form>
      </Card>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Items</p>
        {mealItems.length === 0 ? (
          <p className="text-sm text-muted">No items yet. Add food or recipe below.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {mealItems.map((item) => (
              <MealItemRow
                isLoading={isLoading}
                item={item}
                key={item.id}
                onDelete={handleDeleteItem}
                onUpdate={handleUpdateItem}
              />
            ))}
          </div>
        )}
      </Card>

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
