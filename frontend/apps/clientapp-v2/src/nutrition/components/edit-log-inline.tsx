import {Button, Input, Label, Separator, toast} from '@heroui/react';
import {Check, Trash2, X} from 'lucide-react';
import {useState} from 'react';

import type {FoodLog} from '@/api/foodLogs';

import {computeMacrosFromSnapshot, formatMacroValue} from '@/@utils/nutrition-helpers';
import {useDeleteFoodLogMutation, useUpdateFoodLogMutation} from '@/api/foodLogs';

export default function EditLogInline({log, onClose}: {log: FoodLog; onClose: () => void}) {
  const [updateLog, {isLoading: isUpdating}] = useUpdateFoodLogMutation();
  const [deleteLog, {isLoading: isDeleting}] = useDeleteFoodLogMutation();

  const [amount, setAmount] = useState(String(log.amount ?? ''));
  const [unit, setUnit] = useState(log.unit ?? 'g');

  const displayName = log.food_name_snapshot ?? log.food?.name ?? log.recipe?.name ?? 'Unknown';
  const numericAmount = parseFloat(amount) || 0;
  const isGramLike = unit === 'g' || unit === 'ml';
  const weightG = isGramLike
    ? numericAmount
    : log.weight_g && log.amount
      ? (numericAmount / log.amount) * log.weight_g
      : numericAmount;
  const macros = computeMacrosFromSnapshot(log.macros_snapshot, weightG);

  const handleUpdate = async () => {
    try {
      await updateLog({
        body: {
          amount: numericAmount || null,
          unit: unit || null,
          weight_g: weightG || null,
        },
        id: log.id,
      }).unwrap();
      toast.success('Log updated');
      onClose();
    } catch {
      toast.danger('Failed to update.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLog(log.id).unwrap();
      toast.success('Log removed');
      onClose();
    } catch {
      toast.danger('Failed to delete.');
    }
  };

  const isBusy = isUpdating || isDeleting;

  return (
    <div className="rounded-xl border border-divider bg-default p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{displayName}</h4>
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

      {/* Macros preview */}
      <div className="mb-3 flex gap-3 text-xs text-foreground-400">
        <span>{formatMacroValue(macros.calories, '')} cal</span>
        <span>{formatMacroValue(macros.protein, 'g')} protein</span>
        <span>{formatMacroValue(macros.carbs, 'g')} carbs</span>
        <span>{formatMacroValue(macros.fat, 'g')} fat</span>
      </div>

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
