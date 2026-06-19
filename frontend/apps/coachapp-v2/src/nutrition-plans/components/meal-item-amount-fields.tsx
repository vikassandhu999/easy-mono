import type {Control} from 'react-hook-form';
import {z} from 'zod';

import {FormNumberField, FormTextField} from '@/@components/form-fields';
import type {MealItem} from '@/api/meals';

export const mealItemAmountSchema = z.object({
  amount: z.number().min(0, 'Use 0 or higher').optional(),
  unit: z.string().optional(),
  weight_g: z.number().min(0, 'Use 0 or higher').optional(),
});

export type MealItemAmountValues = z.infer<typeof mealItemAmountSchema>;

export const EMPTY_MEAL_ITEM_AMOUNT_VALUES: MealItemAmountValues = {
  amount: undefined,
  unit: '',
  weight_g: undefined,
};

export function mealItemAmountValues(item: Pick<MealItem, 'amount' | 'unit' | 'weight_g'>): MealItemAmountValues {
  return {
    amount: item.amount ?? undefined,
    unit: item.unit ?? '',
    weight_g: item.weight_g ?? undefined,
  };
}

export function MealItemAmountFields({
  control,
  onValueChange,
}: {
  control: Control<MealItemAmountValues>;
  onValueChange?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
      <FormNumberField
        control={control}
        fullWidth
        label="Amount"
        minValue={0}
        name="amount"
        onValueChange={onValueChange}
      />
      <FormTextField
        control={control}
        fullWidth
        label="Unit"
        name="unit"
        onValueChange={onValueChange}
      />
      <FormNumberField
        control={control}
        fullWidth
        label="Weight, grams"
        minValue={0}
        name="weight_g"
        onValueChange={onValueChange}
      />
    </div>
  );
}
