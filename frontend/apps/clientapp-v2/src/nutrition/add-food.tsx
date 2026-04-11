import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {ArrowLeft, Check} from 'lucide-react';
import {useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import type {PickedItem} from '@/nutrition/components/food-search-picker';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {computeMacrosFromSnapshot, formatMacroValue, MEAL_SLOT_LABELS, MEAL_SLOTS} from '@/@utils/nutrition-helpers';
import {useLogFoodMutation} from '@/api/foodLogs';
import FoodSearchPicker from '@/nutrition/components/food-search-picker';

// ── Types ───────────────────────────────────────────────────

type LocationState = {
  date?: string;
  mealItemId?: string;
  mealSlot?: string;
  replace?: boolean;
};

// ── Component ───────────────────────────────────────────────

export default function AddFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};

  const goBack = useGoBack(ROUTES.NUTRITION);
  const dateISO = state.date ?? new Date().toISOString().slice(0, 10);
  const isReplacement = state.replace === true;
  const mealItemId = state.mealItemId ?? null;

  const [logFood, {isLoading}] = useLogFoodMutation();

  // Step 1: select meal slot
  const [mealSlot, setMealSlot] = useState(state.mealSlot ?? '');

  // Step 2: pick food/recipe
  const [selectedItem, setSelectedItem] = useState<null | PickedItem>(null);

  // Step 3: set amount
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');

  const numericAmount = parseFloat(amount) || 0;
  // For gram/ml units, weight equals amount. For other units (piece, serving, etc.),
  // we can't convert client-side without serving size data — use amount as-is and let
  // the server resolve weight_g from the food's serving sizes.
  const isGramLike = unit === 'g' || unit === 'ml';
  const weightG = isGramLike ? numericAmount : 0;

  // Compute macros preview
  const macros = selectedItem ? computeMacrosFromSnapshot(selectedItem.macros, weightG) : null;

  const handleSelectItem = (item: PickedItem) => {
    setSelectedItem(item);
    setAmount('100');
    setUnit('g');
  };

  const handleLog = async () => {
    if (!selectedItem || !mealSlot) return;
    try {
      await logFood({
        amount: numericAmount || null,
        date: dateISO,
        food_id: selectedItem.type === 'food' ? selectedItem.id : null,
        meal_item_id: isReplacement ? mealItemId : null,
        meal_slot: mealSlot,
        recipe_id: selectedItem.type === 'recipe' ? selectedItem.id : null,
        unit: unit || null,
        weight_g: weightG || null,
      }).unwrap();
      toast.success(`${selectedItem.name} logged`);
      if (isReplacement) {
        goBack();
      } else {
        navigate(ROUTES.NUTRITION, {replace: true});
      }
    } catch {
      toast.danger('Failed to log food.');
    }
  };

  const handleBack = goBack;

  return (
    <PageLayout title={isReplacement ? 'Replace food' : 'Add food'}>
      <div className="max-w-lg">
        {/* Back button */}
        <div className="mb-4">
          <Button
            onPress={handleBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>

        {/* Step 1: Meal slot selector (only if not pre-set) */}
        {!state.mealSlot ? (
          <div className="mb-4">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-foreground-400">
              Meal
            </Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_SLOTS.map((slot) => (
                <Button
                  key={slot}
                  onPress={() => setMealSlot(slot)}
                  size="sm"
                  variant={mealSlot === slot ? 'primary' : 'secondary'}
                >
                  {MEAL_SLOT_LABELS[slot] ?? slot}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-foreground-400">
            Meal: <span className="font-medium text-foreground">{MEAL_SLOT_LABELS[mealSlot] ?? mealSlot}</span>
          </p>
        )}

        {/* Step 2: Food search */}
        {mealSlot ? (
          <div className="mb-4">
            {!selectedItem ? (
              <FoodSearchPicker onSelect={handleSelectItem} />
            ) : (
              <div className="rounded-xl border border-divider bg-default p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedItem.name}</p>
                    <p className="text-xs text-foreground-400">{selectedItem.type === 'recipe' ? 'Recipe' : 'Food'}</p>
                  </div>
                  <Button
                    onPress={() => setSelectedItem(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Change
                  </Button>
                </div>

                {/* Step 3: Amount */}
                <div className="mb-3 flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label className="text-xs text-foreground-400">Amount</Label>
                    <Input
                      inputMode="decimal"
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100"
                      value={amount}
                    />
                  </div>
                  <div className="flex w-20 flex-col gap-1">
                    <Label className="text-xs text-foreground-400">Unit</Label>
                    <Input
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="g"
                      value={unit}
                    />
                  </div>
                </div>

                {/* Macros preview */}
                {macros ? (
                  <div className="mb-3 flex gap-3 text-xs text-foreground-400">
                    <span>{formatMacroValue(macros.calories, '')} cal</span>
                    <span>{formatMacroValue(macros.protein, 'g')} protein</span>
                    <span>{formatMacroValue(macros.carbs, 'g')} carbs</span>
                    <span>{formatMacroValue(macros.fat, 'g')} fat</span>
                  </div>
                ) : null}

                <Separator className="mb-3" />

                <Button
                  className="w-full"
                  isDisabled={numericAmount <= 0}
                  isPending={isLoading}
                  onPress={handleLog}
                  variant="primary"
                >
                  <Check size={14} />
                  {isReplacement ? 'Log replacement' : 'Log food'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
