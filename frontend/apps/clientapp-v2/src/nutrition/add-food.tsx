import {computeMacrosFromSnapshot, formatMacroValue, MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowLeft, Check} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useLocation, useNavigate} from 'react-router-dom';
import {z} from 'zod';

import type {PickedItem} from '@/nutrition/components/food-search-picker';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateFoodLogEntryMutation} from '@/api/mealLogs';
import {applyFormErrors} from '@/api/shared';
import FoodSearchPicker from '@/nutrition/components/food-search-picker';

// ── Types ───────────────────────────────────────────────────

type LocationState = {
  date?: string;
  mealSlot?: string;
  plannedItemIndex?: number;
  replace?: boolean;
};

// ── Schema ──────────────────────────────────────────────────

const amountSchema = z.object({
  amount: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
});

type AmountFormValues = z.infer<typeof amountSchema>;

// ── Component ───────────────────────────────────────────────

export default function AddFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};

  const goBack = useGoBack(ROUTES.NUTRITION);
  const dateISO = state.date ?? new Date().toISOString().slice(0, 10);
  const isReplacement = state.replace === true;
  const plannedItemIndex = state.plannedItemIndex ?? null;

  const [createEntry, {isLoading}] = useCreateFoodLogEntryMutation();

  // Step 1: select meal slot (selection state, not a text input)
  const [mealSlot, setMealSlot] = useState(state.mealSlot ?? '');

  // Step 2: pick food/recipe (selection state)
  const [selectedItem, setSelectedItem] = useState<null | PickedItem>(null);

  // Step 3: amount form
  const {
    formState: {errors},
    register,
    setError,
    setValue,
    watch,
  } = useForm<AmountFormValues>({
    defaultValues: {amount: '', unit: 'g'},
    resolver: zodResolver(amountSchema),
  });

  const amount = watch('amount');
  const unit = watch('unit');

  const numericAmount = parseFloat(amount) || 0;
  const isGramLike = unit === 'g' || unit === 'ml';
  // For gram/ml units, weight equals amount. For other units, resolve from serving_sizes.
  const weightG = useMemo(() => {
    if (isGramLike) return numericAmount;
    if (!selectedItem) return 0;
    const serving = selectedItem.serving_sizes.find((s) => s.unit === unit);
    if (serving?.weight_g && serving.amount) {
      return (numericAmount / serving.amount) * serving.weight_g;
    }
    return 0;
  }, [isGramLike, numericAmount, selectedItem, unit]);

  // Compute macros preview
  const macros = selectedItem ? computeMacrosFromSnapshot(selectedItem.macros, weightG) : null;

  const handleSelectItem = (item: PickedItem) => {
    setSelectedItem(item);
    if (item.serving_sizes.length > 0) {
      const first = item.serving_sizes[0];
      setValue('amount', String(first.amount ?? 1));
      setValue('unit', first.unit);
    } else {
      setValue('amount', '100');
      setValue('unit', 'g');
    }
  };

  const handleSelectServing = (serving: {amount: null | number; unit: string}) => {
    setValue('amount', String(serving.amount ?? 1));
    setValue('unit', serving.unit);
  };

  const handleLog = async () => {
    if (!selectedItem || !mealSlot) return;

    const source = isReplacement ? 'replacement' : 'unplanned';

    try {
      await createEntry({
        amount: numericAmount || 0,
        date: dateISO,
        food_id: selectedItem.type === 'food' ? selectedItem.id : null,
        meal_slot: mealSlot,
        planned_item_index: isReplacement ? plannedItemIndex : null,
        recipe_id: selectedItem.type === 'recipe' ? selectedItem.id : null,
        source,
        unit: unit || 'g',
        weight_g: weightG || 0,
      }).unwrap();
      toast.success(`${selectedItem.name} logged`);
      if (isReplacement) {
        goBack();
      } else {
        navigate(ROUTES.NUTRITION, {replace: true});
      }
    } catch (err) {
      applyFormErrors(err, 'Failed to log food.', setError);
    }
  };

  return (
    <PageLayout title={isReplacement ? 'Replace food' : 'Add food'}>
      <div className="max-w-lg">
        {/* Back button */}
        <div className="mb-4">
          <Button
            onPress={goBack}
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
                      placeholder="100"
                      {...register('amount')}
                    />
                  </div>
                  <div className="flex w-20 flex-col gap-1">
                    <Label className="text-xs text-foreground-400">Unit</Label>
                    <Input
                      placeholder="g"
                      {...register('unit')}
                    />
                  </div>
                </div>

                {/* Serving size chips */}
                {selectedItem.serving_sizes.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {selectedItem.serving_sizes.map((s, i) => (
                      <button
                        className="min-h-11 rounded-full border border-divider bg-content2 px-3 py-1.5 text-xs transition-colors hover:bg-default active:bg-default"
                        key={i}
                        onClick={() => handleSelectServing(s)}
                        type="button"
                      >
                        {s.amount ?? 1} {s.unit}
                      </button>
                    ))}
                    <button
                      className="min-h-11 rounded-full border border-divider bg-content2 px-3 py-1.5 text-xs transition-colors hover:bg-default active:bg-default"
                      onClick={() => {
                        setValue('amount', '100');
                        setValue('unit', 'g');
                      }}
                      type="button"
                    >
                      100 g
                    </button>
                  </div>
                ) : null}

                {/* Macros preview */}
                {macros ? (
                  <div className="mb-3 flex gap-3 text-xs text-foreground-400">
                    <span>{formatMacroValue(macros.calories, '')} cal</span>
                    <span>{formatMacroValue(macros.protein, 'g')} protein</span>
                    <span>{formatMacroValue(macros.carbs, 'g')} carbs</span>
                    <span>{formatMacroValue(macros.fat, 'g')} fat</span>
                  </div>
                ) : null}

                {/* Warning for unresolvable weight */}
                {numericAmount > 0 && !isGramLike && weightG <= 0 ? (
                  <p className="mb-3 text-xs text-warning">Use g, ml, or select a serving size to log this item.</p>
                ) : null}

                {/* Root error */}
                {errors.root?.message ? <p className="mb-3 text-xs text-danger">{errors.root.message}</p> : null}

                <Separator className="mb-3" />

                <Button
                  className="w-full"
                  isDisabled={numericAmount <= 0 || (!isGramLike && weightG <= 0)}
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
