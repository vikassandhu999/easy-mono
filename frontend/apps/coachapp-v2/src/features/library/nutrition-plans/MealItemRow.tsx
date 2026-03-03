import {Button, Input, TextField, toast} from '@heroui/react';
import {Check, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';

import type {MealItem} from '@/entities/meals/api/meals';

type MealItemRowProps = {
  isLoading: boolean;
  item: MealItem;
  name: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, body: {amount?: number; unit?: string; weight_g?: number}) => void;
};

const toNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  return Number(value);
};

export default function MealItemRow({isLoading, item, name, onDelete, onUpdate}: MealItemRowProps) {
  const [amount, setAmount] = useState(item.amount === null ? '' : String(item.amount));
  const [unit, setUnit] = useState(item.unit ?? '');
  const [weightG, setWeightG] = useState(item.weight_g === null ? '' : String(item.weight_g));

  useEffect(() => {
    setAmount(item.amount === null ? '' : String(item.amount));
    setUnit(item.unit ?? '');
    setWeightG(item.weight_g === null ? '' : String(item.weight_g));
  }, [item.amount, item.unit, item.weight_g]);

  const handleSave = async () => {
    try {
      onUpdate(item.id, {
        amount: toNumber(amount),
        unit: unit.trim() || undefined,
        weight_g: toNumber(weightG),
      });
    } catch {
      toast.danger('Unable to update meal item.');
    }
  };

  const typeLabel = item.food_id ? 'Food' : 'Recipe';

  return (
    <div className="px-3 py-2">
      {/* Header: name + actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{typeLabel}</p>
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            className="min-h-7 min-w-7"
            isDisabled={isLoading}
            isIconOnly
            onPress={handleSave}
            size="sm"
            variant="ghost"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="min-h-7 min-w-7"
            isIconOnly
            onPress={() => onDelete(item.id)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Compact 3-column inputs */}
      <div className="mt-2 flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs text-muted">Amount</span>
          <TextField>
            <Input
              className="h-9 min-h-0"
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder="0"
              value={amount}
              variant="secondary"
            />
          </TextField>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs text-muted">Unit</span>
          <TextField>
            <Input
              className="h-9 min-h-0"
              inputMode="text"
              onChange={(e) => setUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder="g, ml..."
              value={unit}
              variant="secondary"
            />
          </TextField>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs text-muted">Weight (g)</span>
          <TextField>
            <Input
              className="h-9 min-h-0"
              inputMode="decimal"
              onChange={(e) => setWeightG(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder="0"
              value={weightG}
              variant="secondary"
            />
          </TextField>
        </div>
      </div>
    </div>
  );
}
