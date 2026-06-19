import {AlertDialog, Button, Form, Input, Spinner, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Pencil, Plus, Trash2} from 'lucide-react';
import {type Ref, useCallback, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';

import type {Food} from '@/api/foods';
import {
  type Meal,
  type MealItemCreateRequest,
  type MealUpdateRequest,
  useCreateMealItemMutation,
  useDeleteMealItemMutation,
  useDeleteMealMutation,
  useUpdateMealMutation,
} from '@/api/meals';
import type {Recipe} from '@/api/recipes';
import {omitUndefined, type ServingSize, toOptionalText} from '@/api/shared';
import {getMealMacroSummary} from '@/domain/nutrition-plans';
import {
  EMPTY_MEAL_ITEM_AMOUNT_VALUES,
  MealItemAmountFields,
  type MealItemAmountValues,
  mealItemAmountSchema,
} from '@/nutrition-plans/components/meal-item-amount-fields';
import MealItemPicker from '@/nutrition-plans/components/meal-item-picker';
import MealItemRow from '@/nutrition-plans/components/meal-item-row';

type SelectedMealItem = {kind: 'food'; food: Food} | {kind: 'recipe'; recipe: Recipe};

function mealItemToCreateRequest({
  selectedItem,
  values,
}: {
  selectedItem: SelectedMealItem;
  values: MealItemAmountValues;
}): MealItemCreateRequest {
  return omitUndefined({
    ...(selectedItem.kind === 'food' ? {food_id: selectedItem.food.id} : {recipe_id: selectedItem.recipe.id}),
    amount: values.amount,
    unit: toOptionalText(values.unit),
    weight_g: values.weight_g,
  });
}

function mealToUpdateRequest(name: string): MealUpdateRequest {
  return {name: name.trim()};
}

function getSelectedMealItemName(selectedItem: null | SelectedMealItem): string {
  if (!selectedItem) {
    return '';
  }
  return selectedItem.kind === 'food' ? selectedItem.food.name : selectedItem.recipe.name;
}

function getSelectedMealItemServingSizes(selectedItem: null | SelectedMealItem): ServingSize[] {
  if (!selectedItem) {
    return [];
  }
  return selectedItem.kind === 'food'
    ? (selectedItem.food.serving_sizes ?? [])
    : (selectedItem.recipe.serving_sizes ?? []);
}

function formatServingLabel(s: ServingSize): string {
  const amt = s.amount ?? 1;
  // If unit is "g" and amount equals weight_g, just show "{amount}g"
  if (s.unit === 'g' && s.weight_g != null && amt === s.weight_g) {
    return `${amt}g`;
  }
  const base = `${amt} ${s.unit}`;
  if (s.weight_g != null) {
    return `${base} · ${s.weight_g}g`;
  }
  return base;
}

function AddMealItemForm({
  isSubmitting,
  itemName,
  onCancel,
  onSubmit,
  servingSizes,
}: {
  isSubmitting: boolean;
  itemName: string;
  onCancel: () => void;
  onSubmit: (values: MealItemAmountValues) => Promise<void>;
  servingSizes: ServingSize[];
}) {
  const [selectedServingIdx, setSelectedServingIdx] = useState<null | number>(null);
  const form = useForm<MealItemAmountValues>({
    defaultValues: EMPTY_MEAL_ITEM_AMOUNT_VALUES,
    resolver: zodResolver(mealItemAmountSchema),
  });

  return (
    <Form
      className="flex flex-col gap-2 rounded-lg border border-dashed border-divider p-3"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Typography
        color="muted"
        type="body-xs"
        weight="medium"
      >
        Adding: <span className="text-foreground">{itemName}</span>
      </Typography>

      {servingSizes.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {servingSizes.map((serving, index) => {
            const isActive = selectedServingIdx === index;
            return (
              <Button
                className={`min-h-11 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
                  isActive ? 'bg-foreground text-background' : 'bg-content2 text-foreground-500 hover:bg-content3'
                }`}
                key={index}
                onPress={() => {
                  form.setValue('amount', serving.amount ?? 1, {shouldDirty: true});
                  form.setValue('unit', serving.unit, {shouldDirty: true});
                  form.setValue('weight_g', serving.weight_g ?? undefined, {shouldDirty: true});
                  setSelectedServingIdx(index);
                }}
                type="button"
                variant="ghost"
              >
                {formatServingLabel(serving)}
              </Button>
            );
          })}
        </div>
      )}

      <MealItemAmountFields
        control={form.control}
        onValueChange={() => setSelectedServingIdx(null)}
      />
      <div className="flex gap-2">
        <Button
          isPending={isSubmitting}
          size="sm"
          type="submit"
        >
          <Plus size={14} />
          {isSubmitting ? 'Adding' : 'Add'}
        </Button>
        <Button
          onPress={onCancel}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}

type MealSectionProps = {
  meal: Meal;
  planId: string;
  sectionRef?: Ref<HTMLDivElement>;
};

export default function MealSection({meal, planId, sectionRef}: MealSectionProps) {
  const [createMealItem, {isLoading: isAddingItem}] = useCreateMealItemMutation();
  const [deleteMealItem, {isLoading: isDeletingItem}] = useDeleteMealItemMutation();
  const [deleteMeal, {isLoading: isDeletingMeal}] = useDeleteMealMutation();
  const [updateMeal, {isLoading: isSavingName}] = useUpdateMealMutation();

  // Inline meal name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(meal.name);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    // Empty guard — revert if cleared
    if (!trimmed) {
      setEditName(meal.name);
      setIsEditingName(false);
      return;
    }
    // No change — just close
    if (trimmed === meal.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateMeal({id: meal.id, planId, body: mealToUpdateRequest(trimmed)}).unwrap();
      setIsEditingName(false);
    } catch {
      setEditName(meal.name);
      setIsEditingName(false);
      toast.danger('Failed to rename meal.');
    }
  };

  // Callback ref to auto-focus the name input when editing starts
  const nameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
    }
  }, []);

  // Inline add-item state
  const [selectedItem, setSelectedItem] = useState<null | SelectedMealItem>(null);

  // Track which item is being removed (for loading state per row)
  const [removingItemId, setRemovingItemId] = useState<null | string>(null);

  // Compute per-meal macro totals
  const mealMacros = useMemo(() => getMealMacroSummary(meal), [meal]);

  const existingFoodIds = meal.meal_items.filter((i) => i.food_id).map((i) => i.food_id as string);
  const existingRecipeIds = meal.meal_items.filter((i) => i.recipe_id).map((i) => i.recipe_id as string);

  const handleSelectFood = (food: Food) => {
    setSelectedItem({kind: 'food', food});
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedItem({kind: 'recipe', recipe});
  };

  const handleAddItem = async (values: MealItemAmountValues) => {
    if (!selectedItem) {
      return;
    }
    try {
      await createMealItem({mealId: meal.id, planId, body: mealItemToCreateRequest({selectedItem, values})}).unwrap();
      setSelectedItem(null);
    } catch {
      // Error handled by RTK Query cache
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId);
    try {
      await deleteMealItem({id: itemId, mealId: meal.id, planId}).unwrap();
    } catch {
      // Error handled by RTK Query cache
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleDeleteMeal = async () => {
    try {
      await deleteMeal({id: meal.id, planId}).unwrap();
    } catch {
      // Error handled by RTK Query cache
    }
  };

  const selectedName = getSelectedMealItemName(selectedItem);
  const servingSizes: ServingSize[] = getSelectedMealItemServingSizes(selectedItem);

  return (
    <div
      className="min-w-0 overflow-hidden rounded-xl border border-divider bg-content1 p-4"
      ref={sectionRef}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        {isEditingName ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              className="max-w-[200px]"
              onBlur={handleSaveName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                  setEditName(meal.name);
                  setIsEditingName(false);
                }
              }}
              ref={nameInputRef}
              value={editName}
            />
            {isSavingName && <Spinner size="sm" />}
          </div>
        ) : (
          <Button
            className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-md px-1 text-left transition-colors hover:bg-content2"
            onPress={() => {
              setEditName(meal.name);
              setIsEditingName(true);
            }}
            variant="ghost"
          >
            <h3 className="truncate text-sm font-semibold">{meal.name}</h3>
            <Pencil
              className="shrink-0 text-foreground-400"
              size={12}
            />
          </Button>
        )}
        <AlertDialog>
          <Button
            aria-label="Delete meal"
            isIconOnly
            size="sm"
            variant="ghost"
          >
            <Trash2 size={14} />
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete meal?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    This will permanently delete <strong>{meal.name}</strong> and all its items. This action cannot be
                    undone.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={isDeletingMeal}
                    onPress={handleDeleteMeal}
                    variant="danger"
                  >
                    {isDeletingMeal ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      {meal.meal_items.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {meal.meal_items.map((item) => (
            <MealItemRow
              isRemoving={isDeletingItem && removingItemId === item.id}
              item={item}
              key={item.id}
              mealId={meal.id}
              onRemove={handleRemoveItem}
              planId={planId}
            />
          ))}
        </div>
      )}

      {meal.meal_items.length > 0 && (mealMacros.calories || mealMacros.protein_g) ? (
        <div className="mb-3 border-t border-dashed border-divider pt-2">
          <Typography
            color="muted"
            type="body-xs"
          >
            {[
              mealMacros.calories ? `${Math.round(mealMacros.calories)} kcal` : null,
              mealMacros.protein_g ? `${Math.round(mealMacros.protein_g)}g protein` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </div>
      ) : null}

      {meal.meal_items.length === 0 && !selectedItem && (
        <Typography
          className="mb-3"
          color="muted"
          type="body-xs"
        >
          No items yet. Add a food or recipe below.
        </Typography>
      )}

      {selectedItem ? (
        <AddMealItemForm
          isSubmitting={isAddingItem}
          itemName={selectedName}
          onCancel={() => setSelectedItem(null)}
          onSubmit={handleAddItem}
          servingSizes={servingSizes}
        />
      ) : (
        <MealItemPicker
          excludeFoodIds={existingFoodIds}
          excludeRecipeIds={existingRecipeIds}
          onSelectFood={handleSelectFood}
          onSelectRecipe={handleSelectRecipe}
        />
      )}
    </div>
  );
}
