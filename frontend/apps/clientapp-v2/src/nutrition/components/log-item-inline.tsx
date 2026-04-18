import {formatMacroValue} from '@easy/utils';
import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Check, RefreshCw, X} from 'lucide-react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import type {PlannedSnapshotItem} from '@/api/mealLogs';

import {useCreateFoodLogEntryMutation} from '@/api/mealLogs';
import {applyFormErrors} from '@/api/shared';

// ── Schema ──────────────────────────────────────────────────

const schema = z.object({
  amount: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

// ── Component ───────────────────────────────────────────────

export default function LogItemInline({
  date,
  item,
  mealSlot,
  onClose,
  onReplace,
  plannedItemIndex,
}: {
  date: string;
  item: PlannedSnapshotItem;
  mealSlot: string;
  onClose: () => void;
  onReplace: () => void;
  plannedItemIndex: number;
}) {
  const [createEntry, {isLoading}] = useCreateFoodLogEntryMutation();

  const {
    formState: {errors},
    control,
    register,
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      amount: String(item.amount ?? ''),
      unit: item.unit ?? 'g',
    },
    resolver: zodResolver(schema),
  });

  const amount = useWatch({control, name: 'amount'}) ?? '';
  const unit = useWatch({control, name: 'unit'}) ?? 'g';

  // Derive weight_g: if unit is 'g'/'ml', weight equals amount.
  // Otherwise, scale proportionally from the plan's weight_g.
  const numericAmount = parseFloat(amount) || 0;
  const isGramLike = unit === 'g' || unit === 'ml';
  const weightG = isGramLike
    ? numericAmount
    : item.weight_g && item.amount
      ? (numericAmount / item.amount) * item.weight_g
      : numericAmount;

  // Compute macros preview from planned item's per-unit values
  const factor = item.weight_g > 0 ? weightG / item.weight_g : 0;
  const previewMacros = {
    calories: (item.calories ?? 0) * factor,
    carbs: (item.carbs_g ?? 0) * factor,
    fat: (item.fat_g ?? 0) * factor,
    protein: (item.protein_g ?? 0) * factor,
  };

  const plannedAmount = item.amount;
  const plannedUnit = item.unit ?? 'g';

  const handleLog = async () => {
    try {
      await createEntry({
        amount: numericAmount || 0,
        date,
        meal_slot: mealSlot,
        planned_item_index: plannedItemIndex,
        source: 'planned',
        unit: unit || 'g',
        weight_g: weightG || 0,
      }).unwrap();
      toast.success(`${item.food_name ?? 'Item'} logged`);
      onClose();
    } catch (err) {
      applyFormErrors(err, 'Failed to log item.', setError);
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
            placeholder="Amount"
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

      {/* Plan reference */}
      {plannedAmount != null ? (
        <p className="mb-2 text-xs text-foreground-400">
          Per plan: {plannedAmount}
          {plannedUnit}
        </p>
      ) : null}

      {/* Macros preview */}
      <div className="mb-3 flex gap-3 text-xs text-foreground-400">
        <span>{formatMacroValue(previewMacros.calories, '')} cal</span>
        <span>{formatMacroValue(previewMacros.protein, 'g')} protein</span>
        <span>{formatMacroValue(previewMacros.carbs, 'g')} carbs</span>
        <span>{formatMacroValue(previewMacros.fat, 'g')} fat</span>
      </div>

      {/* Root error */}
      {errors.root?.message ? <p className="mb-2 text-xs text-danger">{errors.root.message}</p> : null}

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
