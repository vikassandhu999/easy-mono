import {Button, Card, Dropdown, Label, Skeleton, toast} from '@heroui/react';
import {ArrowLeft, EllipsisVertical, Pencil, Plus, Trash2, UtensilsCrossed} from 'lucide-react';
import {Fragment, useCallback, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

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
import {getReturnTo} from '@/features/library/libraryFormShared';
import {MealItemCard} from '@/features/library/nutrition-plans/MealItemCard';
import {RenameMealModal} from '@/features/library/nutrition-plans/RenameMealModal';
import {getApiErrorMessage} from '@/shared/api/shared';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';

export default function NutritionPlanMealEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, mealId} = useParams();
  const planId = id ?? '';
  const editingMealId = mealId ?? '';
  const returnTo = getReturnTo(location, `/library/nutrition-plans/${planId}/builder`);

  const {data: selectedMealData, isLoading: isMealLoading} = useGetMealQuery(editingMealId, {skip: !editingMealId});
  const {data: mealItemsData} = useListMealItemsQuery(editingMealId, {
    skip: !editingMealId,
  });
  const {data: foodsData} = useListFoodsQuery({limit: 250, offset: 0});
  const {data: recipesData} = useListRecipesQuery({limit: 250, offset: 0});

  const [updateMeal, {isLoading: isRenaming}] = useUpdateMealMutation();
  const [deleteMeal, {isLoading: isDeletingMeal}] = useDeleteMealMutation();
  const [updateMealItem] = useUpdateMealItemMutation();

  const meal = selectedMealData?.data;

  const sortedItems = useMemo(
    () => [...(mealItemsData?.data ?? [])].sort((a, b) => a.position - b.position),
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

  const getItemName = (foodId: null | string, recipeId: null | string) => {
    if (foodId) return foodNameMap.get(foodId) ?? 'Food item';
    if (recipeId) return recipeNameMap.get(recipeId) ?? 'Recipe item';
    return 'Unknown item';
  };

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'rename':
        setIsRenameOpen(true);
        break;
      case 'delete':
        setIsDeleteMealOpen(true);
        break;
    }
  };

  const handleRename = async (name: string) => {
    try {
      await updateMeal({
        body: {name, position: meal?.position ?? 0},
        id: editingMealId,
        planId,
      }).unwrap();
      toast.success('Meal renamed');
      setIsRenameOpen(false);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to rename meal'));
    }
  };

  const handleDeleteMeal = async () => {
    setIsDeleteMealOpen(false);
    try {
      await deleteMeal({id: editingMealId, planId}).unwrap();
      toast.success('Meal deleted');
      navigate(returnTo);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete meal'));
    }
  };

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
            mealId: editingMealId,
            planId,
          }).unwrap(),
          updateMealItem({
            body: {position: item.position},
            id: targetItem.id,
            mealId: editingMealId,
            planId,
          }).unwrap(),
        ]);
      } catch (error) {
        toast.danger(getApiErrorMessage(error, 'Failed to reorder items'));
      }
    },
    [editingMealId, sortedItems, planId, updateMealItem],
  );

  if (isMealLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
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
            onPress={() => navigate(returnTo)}
            variant="secondary"
          >
            Back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: back + overflow menu */}
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Day
        </Button>
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              className="min-h-11 min-w-11"
              size="md"
              variant="ghost"
            >
              <EllipsisVertical className="h-5 w-5" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom left">
            <Dropdown.Menu
              aria-label="Meal actions"
              onAction={handleAction}
            >
              <Dropdown.Item
                id="rename"
                textValue="Rename"
              >
                <Pencil className="h-4 w-4" />
                <Label>Rename</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className="text-danger"
                id="delete"
                textValue="Delete meal"
              >
                <Trash2 className="h-4 w-4" />
                <Label>Delete meal</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Title area */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{meal.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {sortedItems.length} item{sortedItems.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-separator" />

      {/* Item list */}
      {sortedItems.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No items yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Add food or recipe items to build this meal.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={() => navigate(`/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/new`)}
              size="md"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Add first item
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedItems.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && <div className="border-t border-separator" />}
              <MealItemCard
                canMove={{down: i < sortedItems.length - 1, up: i > 0}}
                item={item}
                itemName={getItemName(item.food_id, item.recipe_id)}
                onMove={(dir) => handleMoveItem(item, dir)}
                onTap={() =>
                  navigate(`/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/${item.id}`)
                }
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Button
        className="min-h-11 w-full"
        onPress={() => navigate(`/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/new`)}
        variant="secondary"
      >
        <Plus className="h-4 w-4" />
        Add item
      </Button>

      <RenameMealModal
        currentName={meal.name}
        isLoading={isRenaming}
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        onSave={handleRename}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this meal and all its items? This cannot be undone."
        isLoading={isDeletingMeal}
        isOpen={isDeleteMealOpen}
        onConfirm={handleDeleteMeal}
        onOpenChange={setIsDeleteMealOpen}
        title="Delete meal"
      />
    </div>
  );
}
