import {Button, Form, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Apple, ChevronDown, ChevronUp, X} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormNumberField, FormTextField} from '@/@components/form-fields';

import type {Food} from '@/api/generated';
import type {ServingSize} from '@/api/shared';

export type IngredientItem = {
  food: Food;
  food_id: string;
  amount: number | string;
  unit: string;
  weight_g: number | string;
};

type IngredientListProps = {
  value: IngredientItem[];
  onChange: (items: IngredientItem[]) => void;
  autoExpandId?: null | string;
};

const ingredientFieldsSchema = z.object({
  amount: z.number().min(0, 'Use 0 or higher').optional(),
  unit: z.string().optional(),
  weight_g: z.number().min(0, 'Use 0 or higher').optional(),
});

type IngredientFieldsValues = z.infer<typeof ingredientFieldsSchema>;

// Summary string for collapsed rows — same formatting rules as the recipe detail page.
function formatIngredientSummary(item: IngredientItem): string {
  const hasAmount = item.amount !== '' && item.amount != null && Number(item.amount) !== 0;
  const hasWeight = item.weight_g !== '' && item.weight_g != null && Number(item.weight_g) !== 0;

  if (!hasAmount && !hasWeight) {
    return '\u2014';
  }

  const amountPart = hasAmount ? `${item.amount}${item.unit ? ` ${item.unit}` : ''}` : null;
  const weightPart = hasWeight ? `${item.weight_g}g` : null;

  return [amountPart, weightPart].filter(Boolean).join(' \u00b7 ');
}

function formatServingLabel(s: ServingSize): string {
  const amt = s.amount ?? 1;
  if (s.unit === 'g' && s.weight_g != null && amt === s.weight_g) {
    return `${amt}g`;
  }
  const base = `${amt} ${s.unit}`;
  if (s.weight_g != null) {
    return `${base} \u00b7 ${s.weight_g}g`;
  }
  return base;
}

function toOptionalNumber(value: number | string): number | undefined {
  if (value === '' || value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function IngredientFieldsForm({
  item,
  onChange,
}: {
  item: IngredientItem;
  onChange: (field: keyof IngredientItem, fieldValue: number | string) => void;
}) {
  const form = useForm<IngredientFieldsValues>({
    resolver: zodResolver(ingredientFieldsSchema),
    values: {
      amount: toOptionalNumber(item.amount),
      unit: item.unit,
      weight_g: toOptionalNumber(item.weight_g),
    },
  });

  return (
    <Form className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
      <FormNumberField
        control={form.control}
        fullWidth
        label="Amount"
        minValue={0}
        name="amount"
        onValueChange={(value) => onChange('amount', value ?? '')}
        step={0.1}
      />
      <FormTextField
        control={form.control}
        fullWidth
        label="Unit"
        name="unit"
        onValueChange={(value) => onChange('unit', value)}
      />
      <FormNumberField
        control={form.control}
        fullWidth
        label="Weight, grams"
        minValue={0}
        name="weight_g"
        onValueChange={(value) => onChange('weight_g', value ?? '')}
        step={0.1}
      />
    </Form>
  );
}

export default function IngredientList({value, onChange, autoExpandId}: IngredientListProps) {
  const [expandedId, setExpandedId] = useState<null | string>(null);
  // Track active serving size chip per ingredient (keyed by food_id → serving index)
  const [activeServingMap, setActiveServingMap] = useState<Record<string, null | number>>({});

  // Derive the active expanded ID: prefer autoExpandId from parent (newly added item),
  // fall back to user's manual toggle. Parent resets autoExpandId to null after it's consumed.
  const activeExpandedId = autoExpandId ?? expandedId;

  const updateItem = (index: number, field: keyof IngredientItem, fieldValue: number | string) => {
    const updated = value.map((item, i) => (i === index ? {...item, [field]: fieldValue} : item));
    onChange(updated);
  };

  const clearActiveServing = (foodId: string) => {
    setActiveServingMap((prev) => ({...prev, [foodId]: null}));
  };

  const applyServing = (index: number, foodId: string, serving: ServingSize, servingIdx: number) => {
    const updated = value.map((item, i) =>
      i === index
        ? {
            ...item,
            amount: serving.amount != null ? String(serving.amount) : '1',
            unit: serving.unit,
            weight_g: serving.weight_g != null ? String(serving.weight_g) : '',
          }
        : item,
    );
    onChange(updated);
    setActiveServingMap((prev) => ({...prev, [foodId]: servingIdx}));
  };

  const removeItem = (index: number) => {
    const removedId = value[index]?.food_id;
    if (removedId === activeExpandedId) {
      setExpandedId(null);
    }
    onChange(value.filter((_, i) => i !== index));
  };

  const toggleExpand = (foodId: string) => {
    setExpandedId((prev) => (prev === foodId ? null : foodId));
  };

  if (value.length === 0) {
    return (
      <Typography
        color="muted"
        type="body-xs"
      >
        No ingredients added yet. Use the search above to add foods.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {value.map((item, index) => {
        const isExpanded = activeExpandedId === item.food_id;

        return (
          <div
            className="rounded-xl border border-divider"
            key={item.food_id}
          >
            <div className="flex min-h-11 items-center gap-2 px-3">
              <Button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.food.name}`}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2"
                onPress={() => toggleExpand(item.food_id)}
                variant="ghost"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                  {item.food.image_url ? (
                    <img
                      alt={item.food.name}
                      className="size-7 rounded-md object-cover"
                      src={item.food.image_url}
                    />
                  ) : (
                    <Apple
                      className="text-foreground-400"
                      size={14}
                    />
                  )}
                </div>
                <Typography
                  className="min-w-0 flex-1 truncate text-left"
                  type="body-sm"
                  weight="medium"
                >
                  {item.food.name}
                </Typography>
                <Typography
                  className="shrink-0"
                  color="muted"
                  type="body-xs"
                >
                  {formatIngredientSummary(item)}
                </Typography>
                {isExpanded ? (
                  <ChevronUp
                    className="shrink-0 text-foreground-400"
                    size={14}
                  />
                ) : (
                  <ChevronDown
                    className="shrink-0 text-foreground-400"
                    size={14}
                  />
                )}
              </Button>
              <Button
                aria-label={`Remove ${item.food.name}`}
                className="min-h-11 min-w-11"
                onPress={() => removeItem(index)}
                size="sm"
                variant="ghost"
              >
                <X size={14} />
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-divider px-3 pb-3 pt-2">
                {item.food.serving_sizes.length > 0 && (
                  <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {item.food.serving_sizes.map((s, sIdx) => {
                      const isActive = activeServingMap[item.food_id] === sIdx;
                      return (
                        <Button
                          aria-label={`Use serving: ${formatServingLabel(s)}`}
                          className={`min-h-11 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-foreground text-background'
                              : 'bg-content2 text-foreground-500 hover:bg-content3'
                          }`}
                          key={sIdx}
                          onPress={() => applyServing(index, item.food_id, s, sIdx)}
                          variant="ghost"
                        >
                          {formatServingLabel(s)}
                        </Button>
                      );
                    })}
                  </div>
                )}

                <IngredientFieldsForm
                  item={item}
                  onChange={(field, fieldValue) => {
                    updateItem(index, field, fieldValue);
                    clearActiveServing(item.food_id);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
