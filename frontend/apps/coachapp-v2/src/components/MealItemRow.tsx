import {Button, Input, Label, TextField, toast} from '@heroui/react';
import {Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';

import type {MealItem} from '@/api/meals';

type MealItemRowProps = {
  isLoading: boolean;
  item: MealItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, body: {amount?: number; unit?: string; weight_g?: number}) => void;
};

const toNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  return Number(value);
};

export default function MealItemRow({isLoading, item, onDelete, onUpdate}: MealItemRowProps) {
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

  return (
    <div className="rounded-lg border border-separator bg-background p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{item.food_id ? 'Food' : 'Recipe'} item</p>
        <Button
          className="min-h-11"
          onPress={() => onDelete(item.id)}
          size="sm"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField>
          <Label className="text-xs font-medium text-foreground">Amount</Label>
          <Input
            min="0"
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            value={amount}
            variant="secondary"
          />
        </TextField>
        <TextField>
          <Label className="text-xs font-medium text-foreground">Unit</Label>
          <Input
            onChange={(e) => setUnit(e.target.value)}
            value={unit}
            variant="secondary"
          />
        </TextField>
        <TextField>
          <Label className="text-xs font-medium text-foreground">Weight (g)</Label>
          <Input
            min="0"
            onChange={(e) => setWeightG(e.target.value)}
            type="number"
            value={weightG}
            variant="secondary"
          />
        </TextField>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          className="min-h-11"
          isDisabled={isLoading}
          onPress={handleSave}
          size="sm"
          variant="outline"
        >
          Save item
        </Button>
      </div>
    </div>
  );
}
