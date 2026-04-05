import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {Check, RefreshCw, X} from 'lucide-react';
import {useState} from 'react';

import type {TodayPlanMealItem} from '@/api/nutritionPlans';

import {computeMacrosFromSnapshot, formatMacroValue} from '@/@utils/nutrition-helpers';
import {useLogFoodMutation} from '@/api/foodLogs';

// ── Component ───────────────────────────────────────────────

export default function LogItemInline({
  date,
  item,
  mealSlot,
  onClose,
  onReplace,
}: {
  date: string;
  item: TodayPlanMealItem;
  mealSlot: string;
  onClose: () => void;
  onReplace: () => void;
}) {
  const [logFood, {isLoading}] = useLogFoodMutation();
  const [amount, setAmount] = useState(String(item.amount ?? ''));
  const [unit, setUnit] = useState(item.unit ?? 'g');

  // Derive weight_g: if unit is 'g'/'ml', weight equals amount.
  // Otherwise, scale proportionally from the plan's weight_g (e.g. plan: 1 piece=120g → 2 pieces=240g).
  const numericAmount = parseFloat(amount) || 0;
  const isGramLike = unit === 'g' || unit === 'ml';
  const weightG = isGramLike
    ? numericAmount
    : item.weight_g && item.amount
      ? (numericAmount / item.amount) * item.weight_g
      : numericAmount;

  // Compute macros preview
  const macros = computeMacrosFromSnapshot(item.macros, weightG);

  // Planned amounts for reference
  const plannedAmount = item.amount;
  const plannedUnit = item.unit ?? 'g';

  const handleLog = async () => {
    try {
      await logFood({
        amount: numericAmount || null,
        date,
        food_id: item.food_id,
        meal_item_id: item.meal_item_id,
        meal_slot: mealSlot,
        recipe_id: item.recipe_id,
        unit: unit || null,
        weight_g: weightG || null,
      }).unwrap();
      toast.success(`${item.food_name ?? 'Item'} logged`);
      onClose();
    } catch {
      toast.danger('Failed to log item.');
    }
  };

  return (
    <div className="rounded-xl border border-divider bg-default p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{item.food_name ?? 'Log item'}</h4>
        <Button
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Amount inputs */}
      <div className="mb-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label className="text-xs text-foreground-400">Amount</Label>
          <Input
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
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

      {/* Plan reference */}
      {plannedAmount != null ? (
        <p className="mb-2 text-xs text-foreground-400">
          Per plan: {plannedAmount}
          {plannedUnit}
        </p>
      ) : null}

      {/* Macros preview */}
      <div className="mb-3 flex gap-3 text-xs text-foreground-400">
        <span>{formatMacroValue(macros.calories, '')} cal</span>
        <span>{formatMacroValue(macros.protein, 'g')} protein</span>
        <span>{formatMacroValue(macros.carbs, 'g')} carbs</span>
        <span>{formatMacroValue(macros.fat, 'g')} fat</span>
      </div>

      <Separator className="mb-3" />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          isPending={isLoading}
          onPress={handleLog}
          size="sm"
          variant="primary"
        >
          <Check size={14} />
          Log
        </Button>
        <Button
          onPress={onReplace}
          size="sm"
          variant="secondary"
        >
          <RefreshCw size={14} />
          Replace
        </Button>
      </div>
    </div>
  );
}
