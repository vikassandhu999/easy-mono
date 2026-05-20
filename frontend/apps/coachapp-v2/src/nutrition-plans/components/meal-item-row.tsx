import {Button, FieldError, Form, Input, Label, NumberField, TextField, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Apple, Check, ChefHat, Trash2} from 'lucide-react';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import type {MealItem} from '@/api/meals';

import {useUpdateMealItemMutation} from '@/api/meals';

const mealItemFormSchema = z.object({
  amount: z.number().min(0, 'Use 0 or higher').optional(),
  unit: z.string().optional(),
  weight_g: z.number().min(0, 'Use 0 or higher').optional(),
});

type MealItemFormValues = z.infer<typeof mealItemFormSchema>;

type MealItemRowProps = {
  isRemoving: boolean;
  item: MealItem;
  mealId: string;
  onRemove: (itemId: string) => void;
  planId: string;
};

export default function MealItemRow({item, mealId, planId, onRemove, isRemoving}: MealItemRowProps) {
  const isRecipe = Boolean(item.recipe_id);
  const Icon = isRecipe ? ChefHat : Apple;
  const name = isRecipe ? item.recipe?.name : item.food?.name;
  const imageUrl = isRecipe ? item.recipe?.image_url : item.food?.image_url;

  const [updateMealItem, {isLoading: isSaving}] = useUpdateMealItemMutation();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<MealItemFormValues>({
    defaultValues: {
      amount: item.amount ?? undefined,
      unit: item.unit ?? '',
      weight_g: item.weight_g ?? undefined,
    },
    resolver: zodResolver(mealItemFormSchema),
    values: isEditing
      ? {
          amount: item.amount ?? undefined,
          unit: item.unit ?? '',
          weight_g: item.weight_g ?? undefined,
        }
      : undefined,
  });

  const startEditing = () => setIsEditing(true);
  const cancelEditing = () => setIsEditing(false);

  const handleSave = async (values: MealItemFormValues) => {
    const unit = values.unit?.trim() || undefined;

    if (values.amount === undefined && unit === undefined && values.weight_g === undefined) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMealItem({
        body: {
          ...(values.amount !== undefined ? {amount: values.amount} : {}),
          ...(unit !== undefined ? {unit} : {}),
          ...(values.weight_g !== undefined ? {weight_g: values.weight_g} : {}),
        },
        id: item.id,
        mealId,
        planId,
      }).unwrap();
      setIsEditing(false);
    } catch {
      toast.danger('Amounts were not updated');
    }
  };

  const details: string[] = [];
  if (item.amount != null) {
    details.push(`${item.amount}${item.unit ? ` ${item.unit}` : ''}`);
  }
  if (item.weight_g != null) {
    details.push(`${item.weight_g}g`);
  }

  const hasAmounts = details.length > 0;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-divider bg-content1 px-3 py-2">
        <div className="flex min-h-11 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-content2">
            {imageUrl ? (
              <img
                alt={name ?? ''}
                className="size-8 rounded-md object-cover"
                src={imageUrl}
              />
            ) : (
              <Icon
                className="text-foreground-400"
                size={16}
              />
            )}
          </div>
          <Typography
            className="min-w-0 truncate"
            type="body-sm"
            weight="medium"
          >
            {name ?? (isRecipe ? 'Recipe' : 'Food')}
          </Typography>
        </div>
        <Form
          className="gap-2"
          onSubmit={form.handleSubmit(handleSave)}
        >
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
            <Controller
              control={form.control}
              name="amount"
              render={({field}) => (
                <NumberField
                  fullWidth
                  isInvalid={!!form.formState.errors.amount}
                  minValue={0}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
                  value={field.value}
                >
                  <Label>Amount</Label>
                  {form.formState.errors.amount && <FieldError>{form.formState.errors.amount.message}</FieldError>}
                  <NumberField.Group>
                    <NumberField.Input />
                  </NumberField.Group>
                </NumberField>
              )}
            />
            <Controller
              control={form.control}
              name="unit"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!form.formState.errors.unit}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Unit</Label>
                  {form.formState.errors.unit && <FieldError>{form.formState.errors.unit.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
            <Controller
              control={form.control}
              name="weight_g"
              render={({field}) => (
                <NumberField
                  fullWidth
                  isInvalid={!!form.formState.errors.weight_g}
                  minValue={0}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
                  value={field.value}
                >
                  <Label>Weight, grams</Label>
                  {form.formState.errors.weight_g && <FieldError>{form.formState.errors.weight_g.message}</FieldError>}
                  <NumberField.Group>
                    <NumberField.Input />
                  </NumberField.Group>
                </NumberField>
              )}
            />
          </div>
          <div className="flex gap-2">
            <Button
              isPending={isSaving}
              size="sm"
              type="submit"
            >
              <Check size={14} />
              {isSaving ? 'Saving' : 'Save'}
            </Button>
            <Button
              onPress={cancelEditing}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </Form>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center gap-3 rounded-lg border border-divider bg-content1 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-content2">
        {imageUrl ? (
          <img
            alt={name ?? ''}
            className="size-8 rounded-md object-cover"
            src={imageUrl}
          />
        ) : (
          <Icon
            className="text-foreground-400"
            size={16}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Typography
          className="truncate"
          type="body-sm"
          weight="medium"
        >
          {name ?? (isRecipe ? 'Recipe' : 'Food')}
        </Typography>
        {hasAmounts ? (
          <Button
            className="min-h-11 text-left text-xs text-foreground-500 transition-colors hover:text-foreground"
            onPress={startEditing}
            variant="ghost"
          >
            {details.join(' / ')}
          </Button>
        ) : (
          <Button
            className="min-h-11 text-left text-xs text-foreground-400 transition-colors hover:text-foreground"
            onPress={startEditing}
            variant="ghost"
          >
            Set amount
          </Button>
        )}
      </div>

      <Button
        aria-label="Remove item"
        isIconOnly
        isPending={isRemoving}
        onPress={() => onRemove(item.id)}
        size="sm"
        variant="ghost"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
