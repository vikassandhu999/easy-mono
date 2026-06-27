import {Button, Form, Label, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Apple, ArrowDown, ArrowUp, ChevronDown, ChevronUp, X} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormNumberField, FormTextField} from '@/@components/form-fields';

import type {Food} from '@/api/generated';
import {type ServingSize, toOptionalNumber} from '@/api/shared';

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
  onAutoExpandConsumed?: () => void;
};

const ingredientFieldsSchema = z
  .object({
    amount: z.number().min(0, 'Use 0 or higher').optional(),
    unit: z.string().optional(),
    weight_g: z.number().min(0.1, 'Weight must be greater than 0'),
  })
  .refine((data) => !data.amount || (data.unit != null && data.unit.trim() !== ''), {
    message: 'Add a unit',
    path: ['unit'],
  });

type IngredientFieldsValues = z.infer<typeof ingredientFieldsSchema>;

// Summary string for collapsed rows — same formatting rules as the recipe detail page.
function formatIngredientSummary(item: IngredientItem): string {
  const hasAmount = item.amount !== '' && item.amount != null && Number(item.amount) !== 0;
  const hasWeight = item.weight_g !== '' && item.weight_g != null && Number(item.weight_g) !== 0;

  if (!hasAmount && !hasWeight) {
    return '—';
  }

  const amountPart = hasAmount ? `${item.amount}${item.unit ? ` ${item.unit}` : ''}` : null;
  const weightPart = hasWeight ? `${item.weight_g}g` : null;

  return [amountPart, weightPart].filter(Boolean).join(' · ');
}

function formatServingLabel(s: ServingSize): string {
  const amt = s.amount ?? 1;
  if (s.unit === 'g' && s.weight_g != null && amt === s.weight_g) {
    return `${amt}g`;
  }
  const base = `${amt} ${s.unit}`;
  if (s.weight_g != null) {
    return `${base} · ${s.weight_g}g`;
  }
  return base;
}

// Per-ingredient macro preview scaled from the food's per-100g values.
function formatIngredientMacros(food: Food, weightG: number): string {
  const factor = weightG / 100;
  const cal = Math.round((food.calories_per_100g ?? 0) * factor);
  const protein = Math.round((food.protein_g_per_100g ?? 0) * factor);
  const carbs = Math.round((food.carbs_g_per_100g ?? 0) * factor);
  const fat = Math.round((food.fat_g_per_100g ?? 0) * factor);
  return `${cal} kcal · ${protein}P · ${carbs}C · ${fat}F`;
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
      weight_g: toOptionalNumber(item.weight_g) ?? 0,
    },
  });

  return (
    <Form className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
        minValue={0.1}
        name="weight_g"
        onValueChange={(value) => onChange('weight_g', value ?? '')}
        step={0.1}
      />
    </Form>
  );
}

export default function IngredientList({value, onChange, autoExpandId, onAutoExpandConsumed}: IngredientListProps) {
  const [expandedId, setExpandedId] = useState<null | string>(null);
  // Track active serving size chip per ingredient (keyed by food_id → serving index)
  const [activeServingMap, setActiveServingMap] = useState<Record<string, null | number>>({});
  const quickFillBaseId = useId();
  const autoExpandRowRef = useRef<HTMLDivElement | null>(null);

  // Derive the active expanded ID: prefer autoExpandId from parent (newly added item),
  // fall back to user's manual toggle. Parent resets autoExpandId to null after it's consumed.
  const activeExpandedId = autoExpandId ?? expandedId;

  // Scroll the freshly auto-expanded row into view when the parent sets autoExpandId.
  useEffect(() => {
    if (autoExpandId && autoExpandRowRef.current) {
      autoExpandRowRef.current.scrollIntoView({block: 'nearest'});
    }
  }, [autoExpandId]);

  const updateItem = (index: number, field: keyof IngredientItem, fieldValue: number | string) => {
    const updated = value.map((item, i) => (i === index ? {...item, [field]: fieldValue} : item));
    onChange(updated);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) {
      return;
    }
    const updated = [...value];
    const current = updated[index];
    const swapWith = updated[target];
    if (!current || !swapWith) {
      return;
    }
    updated[index] = swapWith;
    updated[target] = current;
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
    // Manually toggling the auto-expanded row hands control back to the parent.
    if (foodId === autoExpandId) {
      onAutoExpandConsumed?.();
      setExpandedId(null);
      return;
    }
    setExpandedId((prev) => (prev === foodId ? null : foodId));
  };

  if (value.length === 0) {
    return (
      <Typography
        color="muted"
        type="body-xs"
      >
        No ingredients yet. Use “Add ingredient” to add foods.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, index) => {
        const isExpanded = activeExpandedId === item.food_id;
        const activeServing = activeServingMap[item.food_id] ?? null;
        const quickFillLabelId = `${quickFillBaseId}-${item.food_id}`;
        const weightG = toOptionalNumber(item.weight_g);
        const macroPreview = weightG && weightG > 0 ? formatIngredientMacros(item.food, weightG) : null;

        return (
          <div
            className="overflow-hidden rounded-lg border border-border bg-surface"
            key={item.food_id}
            ref={item.food_id === autoExpandId ? autoExpandRowRef : undefined}
          >
            <div className="flex min-h-11 items-center gap-2 pr-2 pl-3">
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.food.name}`}
                className="-mx-1 flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                onClick={() => toggleExpand(item.food_id)}
                type="button"
              >
                <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-secondary">
                  {item.food.image_url ? (
                    <img
                      alt={item.food.name}
                      className="size-7 object-cover"
                      src={item.food.image_url}
                    />
                  ) : (
                    <Apple
                      className="text-muted"
                      size={14}
                    />
                  )}
                </span>
                <Typography
                  className="min-w-0 flex-1 truncate"
                  type="body-sm"
                  weight="medium"
                >
                  {item.food.name}
                </Typography>
                <Typography
                  className="shrink-0"
                  color="muted"
                  type="body-sm"
                >
                  {formatIngredientSummary(item)}
                </Typography>
                {isExpanded ? (
                  <ChevronUp
                    className="shrink-0 text-muted"
                    size={15}
                  />
                ) : (
                  <ChevronDown
                    className="shrink-0 text-muted"
                    size={15}
                  />
                )}
              </button>
              <Button
                aria-label={`Move ${item.food.name} up`}
                isDisabled={index === 0}
                isIconOnly
                onPress={() => moveItem(index, -1)}
                size="sm"
                variant="ghost"
              >
                <ArrowUp size={16} />
              </Button>
              <Button
                aria-label={`Move ${item.food.name} down`}
                isDisabled={index === value.length - 1}
                isIconOnly
                onPress={() => moveItem(index, 1)}
                size="sm"
                variant="ghost"
              >
                <ArrowDown size={16} />
              </Button>
              <Button
                aria-label={`Remove ${item.food.name}`}
                isIconOnly
                onPress={() => removeItem(index)}
                size="sm"
                variant="ghost"
              >
                <X size={18} />
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-3">
                {item.food.serving_sizes.length > 0 && (
                  <div className="mb-3">
                    <Label
                      className="mb-1.5 block text-sm font-medium text-muted"
                      id={quickFillLabelId}
                    >
                      Quick fill
                    </Label>
                    <ToggleButtonGroup
                      aria-labelledby={quickFillLabelId}
                      className="flex flex-wrap gap-1.5"
                      isDetached
                      onSelectionChange={(keys) => {
                        const first = [...keys][0];
                        if (first == null) {
                          return;
                        }
                        const sIdx = Number(first);
                        const serving = item.food.serving_sizes[sIdx];
                        if (serving) {
                          applyServing(index, item.food_id, serving, sIdx);
                        }
                      }}
                      selectedKeys={activeServing != null ? [String(activeServing)] : []}
                      selectionMode="single"
                      size="sm"
                    >
                      {item.food.serving_sizes.map((s, sIdx) => (
                        <ToggleButton
                          aria-label={`Use serving: ${formatServingLabel(s)}`}
                          id={String(sIdx)}
                          key={sIdx}
                        >
                          {formatServingLabel(s)}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </div>
                )}

                <IngredientFieldsForm
                  item={item}
                  onChange={(field, fieldValue) => {
                    updateItem(index, field, fieldValue);
                    clearActiveServing(item.food_id);
                  }}
                />

                {macroPreview && (
                  <Typography
                    className="mt-2"
                    color="muted"
                    type="body-xs"
                  >
                    {macroPreview}
                  </Typography>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
