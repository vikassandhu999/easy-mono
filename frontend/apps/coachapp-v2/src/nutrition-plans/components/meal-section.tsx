import {AlertDialog, Button, Input} from '@heroui/react';
import {Plus, Trash2} from 'lucide-react';
import {type Ref, useState} from 'react';

import type {Food} from '@/api/foods';
import type {Meal} from '@/api/meals';
import type {Recipe} from '@/api/recipes';

import {useCreateMealItemMutation, useDeleteMealItemMutation, useDeleteMealMutation} from '@/api/meals';
import MealItemPicker from '@/nutrition-plans/components/meal-item-picker';
import MealItemRow from '@/nutrition-plans/components/meal-item-row';

type SelectedItem = {kind: 'food'; food: Food} | {kind: 'recipe'; recipe: Recipe};

type MealSectionProps = {
  meal: Meal;
  planId: string;
  /** Optional ref for scrolling to this section (supports both RefObject and callback refs) */
  sectionRef?: Ref<HTMLDivElement>;
};

/**
 * A single meal card inside the nutrition plan builder.
 *
 * Shows the meal name, its items (foods/recipes), and controls to:
 * - Add a food or recipe via tabbed picker (MealItemPicker)
 * - Set amount/unit/weight before confirming
 * - Remove items
 * - Delete the entire meal (AlertDialog confirmation)
 */
export default function MealSection({meal, planId, sectionRef}: MealSectionProps) {
  const [createMealItem, {isLoading: isAddingItem}] = useCreateMealItemMutation();
  const [deleteMealItem, {isLoading: isDeletingItem}] = useDeleteMealItemMutation();
  const [deleteMeal, {isLoading: isDeletingMeal}] = useDeleteMealMutation();

  // Inline add-item state
  const [selectedItem, setSelectedItem] = useState<null | SelectedItem>(null);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [weightG, setWeightG] = useState('');

  // Track which item is being removed (for loading state per row)
  const [removingItemId, setRemovingItemId] = useState<null | string>(null);

  const existingFoodIds = meal.meal_items.filter((i) => i.food_id).map((i) => i.food_id as string);
  const existingRecipeIds = meal.meal_items.filter((i) => i.recipe_id).map((i) => i.recipe_id as string);

  const handleSelectFood = (food: Food) => {
    setSelectedItem({kind: 'food', food});
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedItem({kind: 'recipe', recipe});
  };

  const handleAddItem = async () => {
    if (!selectedItem) return;
    try {
      const body = {
        ...(selectedItem.kind === 'food' ? {food_id: selectedItem.food.id} : {recipe_id: selectedItem.recipe.id}),
        ...(amount && {amount: Number(amount)}),
        ...(unit && {unit}),
        ...(weightG && {weight_g: Number(weightG)}),
      };
      await createMealItem({mealId: meal.id, planId, body}).unwrap();
      setSelectedItem(null);
      setAmount('');
      setUnit('');
      setWeightG('');
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

  const selectedName = selectedItem
    ? selectedItem.kind === 'food'
      ? selectedItem.food.name
      : selectedItem.recipe.name
    : '';

  return (
    <div
      className="min-w-0 overflow-hidden rounded-xl border border-divider bg-content1 p-4"
      ref={sectionRef}
    >
      {/* Meal header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{meal.name}</h3>
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

      {/* Meal items list */}
      {meal.meal_items.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {meal.meal_items.map((item) => (
            <MealItemRow
              isRemoving={isDeletingItem && removingItemId === item.id}
              item={item}
              key={item.id}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
      )}

      {meal.meal_items.length === 0 && !selectedItem && (
        <p className="mb-3 text-xs text-foreground-400">No items yet. Add a food or recipe below.</p>
      )}

      {/* Add item flow */}
      {selectedItem ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-divider p-3">
          <p className="text-xs font-medium text-foreground-500">
            Adding: <span className="text-foreground">{selectedName}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs text-foreground-400"
                htmlFor={`amount-${meal.id}`}
              >
                Amount
              </label>
              <Input
                id={`amount-${meal.id}`}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                type="number"
                value={amount}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs text-foreground-400"
                htmlFor={`unit-${meal.id}`}
              >
                Unit
              </label>
              <Input
                id={`unit-${meal.id}`}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="serving"
                value={unit}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs text-foreground-400"
                htmlFor={`weight-${meal.id}`}
              >
                Weight (g)
              </label>
              <Input
                id={`weight-${meal.id}`}
                inputMode="decimal"
                onChange={(e) => setWeightG(e.target.value)}
                placeholder="100"
                type="number"
                value={weightG}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              isPending={isAddingItem}
              onPress={handleAddItem}
              size="sm"
            >
              <Plus size={14} />
              {isAddingItem ? 'Adding...' : 'Add'}
            </Button>
            <Button
              onPress={() => {
                setSelectedItem(null);
                setAmount('');
                setUnit('');
                setWeightG('');
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
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
