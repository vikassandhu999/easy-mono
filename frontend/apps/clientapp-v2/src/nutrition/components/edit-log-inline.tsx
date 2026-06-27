import {formatMacroValue} from '@easy/utils';
import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Check, Trash2, X} from 'lucide-react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import type {FoodLogEntry} from '@/api/mealLogs';

import {useDeleteFoodLogEntryMutation, useUpdateFoodLogEntryMutation} from '@/api/mealLogs';
import {applyFormErrors} from '@/api/shared';

// ── Schema ──────────────────────────────────────────────────

const schema = z.object({
  amount: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

// ── Component ───────────────────────────────────────────────

export default function EditLogInline({entry, onClose}: {entry: FoodLogEntry; onClose: () => void}) {
  const [updateEntry, {isLoading: isUpdating}] = useUpdateFoodLogEntryMutation();
  const [deleteEntry, {isLoading: isDeleting}] = useDeleteFoodLogEntryMutation();

  const {
    formState: {errors},
    control,
    register,
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      amount: String(entry.amount ?? ''),
      unit: entry.unit ?? 'g',
    },
    resolver: zodResolver(schema),
  });

  const amount = useWatch({control, name: 'amount'}) ?? '';
  const unit = useWatch({control, name: 'unit'}) ?? 'g';

  const numericAmount = parseFloat(amount) || 0;
  const isGramLike = unit === 'g' || unit === 'ml';
  const weightG = isGramLike
    ? numericAmount
    : entry.weight_g && entry.amount
      ? (numericAmount / entry.amount) * entry.weight_g
      : numericAmount;

  // Estimate macros from current entry values scaled by weight change
  const originalWeightG = entry.weight_g ?? 0;
  const factor = originalWeightG > 0 ? weightG / originalWeightG : 0;
  const previewMacros = {
    calories: (entry.calories ?? 0) * factor,
    carbs: (entry.carbs_g ?? 0) * factor,
    fat: (entry.fat_g ?? 0) * factor,
    protein: (entry.protein_g ?? 0) * factor,
  };

  const handleUpdate = async () => {
    try {
      await updateEntry({
        body: {
          amount: numericAmount || null,
          unit: unit || null,
          weight_g: weightG || null,
        },
        id: entry.id,
      }).unwrap();
      toast.success('Log updated');
      onClose();
    } catch (err) {
      applyFormErrors(err, 'Failed to update.', setError);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id).unwrap();
      toast.success('Log removed');
      onClose();
    } catch {
      toast.danger('Failed to delete.');
    }
  };

  const isBusy = isUpdating || isDeleting;

  return (
    <div className="rounded-xl border border-border bg-default p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{entry.food_name}</h4>
        <Button
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>

      <div className="mb-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label className="text-xs text-muted">Amount</Label>
          <Input
            inputMode="decimal"
            placeholder="Amount"
            {...register('amount')}
          />
        </div>
        <div className="flex w-20 flex-col gap-1">
          <Label className="text-xs text-muted">Unit</Label>
          <Input
            placeholder="g"
            {...register('unit')}
          />
        </div>
      </div>

      {/* Macros preview */}
      <div className="mb-3 flex gap-3 text-xs text-muted">
        <span>{formatMacroValue(previewMacros.calories, '')} cal</span>
        <span>{formatMacroValue(previewMacros.protein, 'g')} protein</span>
        <span>{formatMacroValue(previewMacros.carbs, 'g')} carbs</span>
        <span>{formatMacroValue(previewMacros.fat, 'g')} fat</span>
      </div>

      {/* Root error */}
      {errors.root?.message ? <p className="mb-2 text-xs text-danger">{errors.root.message}</p> : null}

      <Separator className="mb-3" />

      <div className="flex gap-2">
        <Button
          className="flex-1"
          isDisabled={isBusy}
          isPending={isUpdating}
          onPress={handleUpdate}
          size="sm"
          variant="primary"
        >
          <Check size={14} />
          Update
        </Button>
        <Button
          isDisabled={isBusy}
          isPending={isDeleting}
          onPress={handleDelete}
          size="sm"
          variant="danger"
        >
          <Trash2 size={14} />
          Delete
        </Button>
      </div>
    </div>
  );
}
