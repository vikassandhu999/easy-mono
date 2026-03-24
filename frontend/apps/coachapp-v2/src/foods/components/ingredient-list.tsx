import {Button, Input} from '@heroui/react';
import {Apple, X} from 'lucide-react';

import type {Food} from '@/api/foods';

/** A single ingredient entry with food reference + editable amount/unit/weight */
export type IngredientItem = {
  food: Food;
  food_id: string;
  amount: number | string;
  unit: string;
  weight_g: number | string;
};

type IngredientListProps = {
  /** Current list of ingredients */
  value: IngredientItem[];
  /** Called when the list changes (add, remove, edit) */
  onChange: (items: IngredientItem[]) => void;
};

/**
 * Inline ingredient list with editable amount/unit/weight per row + remove button.
 *
 * Container decision: INLINE — keyboard inputs are part of the form flow.
 *
 * Reusable: lives in foods/components/. Takes value/onChange so any parent can control state.
 */
export default function IngredientList({value, onChange}: IngredientListProps) {
  const updateItem = (index: number, field: keyof IngredientItem, fieldValue: number | string) => {
    const updated = value.map((item, i) => (i === index ? {...item, [field]: fieldValue} : item));
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  if (value.length === 0) {
    return <p className="text-xs text-foreground-400">No ingredients added yet. Use the search above to add foods.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((item, index) => (
        <div
          className="rounded-xl border border-divider p-3"
          key={item.food_id}
        >
          {/* Food name + remove button */}
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
              {item.food.image_url ? (
                <img
                  alt={item.food.name}
                  className="size-8 rounded-lg object-cover"
                  src={item.food.image_url}
                />
              ) : (
                <Apple
                  className="text-foreground-400"
                  size={16}
                />
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.food.name}</p>
            <Button
              aria-label={`Remove ${item.food.name}`}
              onPress={() => removeItem(index)}
              size="sm"
              variant="ghost"
            >
              <X size={14} />
            </Button>
          </div>

          {/* Amount / Unit / Weight fields */}
          <div className="grid grid-cols-3 gap-2">
            <Input
              aria-label="Amount"
              className="text-sm"
              inputMode="decimal"
              onChange={(e) => updateItem(index, 'amount', e.target.value)}
              placeholder="Amount"
              step="0.1"
              type="number"
              value={String(item.amount)}
            />
            <Input
              aria-label="Unit"
              className="text-sm"
              onChange={(e) => updateItem(index, 'unit', e.target.value)}
              placeholder="Unit (e.g. cup)"
              value={item.unit}
            />
            <Input
              aria-label="Weight (g)"
              className="text-sm"
              inputMode="decimal"
              onChange={(e) => updateItem(index, 'weight_g', e.target.value)}
              placeholder="Weight (g)"
              step="0.1"
              type="number"
              value={String(item.weight_g)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
