import {Button, ListBox} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useRef} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {type Food, type Recipe, useGetFoodQuery, useGetRecipeQuery} from '@/api/nutrition-foods';
import type {NutritionPortion} from '@/api/nutrition-plans';
import {FormNumberField} from '@/ui/form-number-field';
import {FormSelectField} from '@/ui/form-select-field';
import {ResponsiveOverlay} from '@/ui/responsive-overlay';
import type {ItemInput, MenuItem} from './menu';

export type MealItemDraft = ItemInput;
const amountSchema = z.object({
  unit: z.string().min(1),
  amount: z.number().finite().positive('Enter an amount greater than zero'),
});
type AmountValues = z.infer<typeof amountSchema>;
type Unit = {key: string; name: string; portion: NutritionPortion};

export function AmountSheetContent({
  food,
  recipe,
  existingItem,
  onEditAmount,
  onCollect,
  formId,
  onCanConfirmChange,
}: {
  food: Food | null;
  recipe: Recipe | null;
  existingItem?: MenuItem;
  onEditAmount?: (portion: NutritionPortion) => void;
  onCollect?: (item: ItemInput) => void;
  formId?: string;
  onCanConfirmChange?: (valid: boolean) => void;
}) {
  const source = recipe ?? food;
  const units: Unit[] = (source?.portion_options ?? []).map((portion, index) => ({
    key: String(index),
    name: portion.kind === 'gram' ? 'Grams' : (portion.label ?? portion.unit ?? 'Servings'),
    portion,
  }));
  const stored = existingItem?.portion ?? source?.default_portion;
  let initialUnit =
    stored?.kind === 'gram'
      ? units.find((unit) => unit.portion.kind === 'gram')
      : stored
        ? units.find(
            (unit) =>
              unit.portion.kind === 'serving' &&
              unit.portion.unit === stored.unit &&
              unit.portion.label === stored.label,
          )
        : undefined;
  // A removed library serving remains editable in its recorded unit. The server
  // validates whether it can still resolve that unit when the menu is saved.
  if (stored && !initialUnit) {
    initialUnit = {
      key: 'recorded',
      name: stored.kind === 'gram' ? 'Grams' : stored.label || stored.unit,
      portion: stored,
    };
    units.push(initialUnit);
  }
  const form = useForm<AmountValues>({
    resolver: zodResolver(amountSchema),
    mode: 'onChange',
    defaultValues: {
      unit: initialUnit?.key ?? '',
      amount: (stored?.kind === 'gram' ? stored.grams : stored?.amount) ?? 0,
    },
  });
  const values = form.watch();
  const canConfirm = amountSchema.safeParse(values).success;
  useEffect(() => {
    onCanConfirmChange?.(canConfirm);
  }, [canConfirm, onCanConfirmChange]);
  const submit = ({unit: key, amount}: AmountValues) => {
    const unit = units.find((unit) => unit.key === key);
    if (!unit) {
      return;
    }
    const portion: NutritionPortion =
      unit.portion.kind === 'gram'
        ? {kind: 'gram', grams: amount}
        : {kind: 'serving', amount, unit: unit.portion.unit, label: unit.portion.label};
    if (onEditAmount) {
      onEditAmount(portion);
    } else if (onCollect && recipe) {
      onCollect({kind: 'recipe', recipe_id: recipe.id, portion});
    } else if (onCollect && food) {
      onCollect({kind: 'food', food_id: food.id, portion});
    }
  };
  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col gap-4"
    >
      <FormSelectField
        control={form.control}
        name="unit"
        label="Unit"
      >
        {units.map((unit) => (
          <ListBox.Item
            key={unit.key}
            id={unit.key}
            textValue={unit.name}
          >
            {unit.name}
          </ListBox.Item>
        ))}
      </FormSelectField>
      <FormNumberField
        control={form.control}
        name="amount"
        label="Amount"
        isRequired
        minValue={0}
      />
      <p className="type-body-sm text-muted">Nutrition totals are calculated when you save the menu.</p>
      {onEditAmount ? (
        <Button
          type="submit"
          variant="primary"
          isDisabled={!canConfirm}
        >
          Done
        </Button>
      ) : null}
    </form>
  );
}

export function AmountSheet({
  open,
  onClose,
  existingItem,
  onEditAmount,
  anchorEl,
}: {
  open: boolean;
  onClose: () => void;
  existingItem: MenuItem;
  onEditAmount: (portion: NutritionPortion) => void;
  anchorEl: HTMLElement;
}) {
  const triggerRef = useRef<HTMLElement | null>(anchorEl);
  triggerRef.current = anchorEl;
  const foodQuery = useGetFoodQuery(existingItem.food_id ?? '', {enabled: open && existingItem.kind === 'food'});
  const recipeQuery = useGetRecipeQuery(existingItem.recipe_id ?? '', {
    enabled: open && existingItem.kind === 'recipe',
  });
  const loading = existingItem.kind === 'food' ? foodQuery.isLoading : recipeQuery.isLoading;
  return (
    <ResponsiveOverlay
      isOpen={open}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={existingItem.name ?? 'Amount'}
      triggerRef={triggerRef}
      width="w-96"
    >
      {loading ? (
        <p className="type-body-sm text-muted">Loading portions…</p>
      ) : (
        <AmountSheetContent
          key={existingItem.id}
          existingItem={existingItem}
          food={foodQuery.data?.data ?? null}
          recipe={recipeQuery.data?.data ?? null}
          onEditAmount={onEditAmount}
        />
      )}
    </ResponsiveOverlay>
  );
}
