import {Button, Form, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Apple, Check, ChefHat, Trash2} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

import {mealItemToUpdateRequest} from '@/api/mappers/meals';
import type {MealItem} from '@/api/meals';

import {useUpdateMealItemMutation} from '@/api/meals';
import {
  MealItemAmountFields,
  type MealItemAmountValues,
  mealItemAmountSchema,
  mealItemAmountValues,
} from '@/nutrition-plans/components/meal-item-amount-fields';

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
  const currentValues = mealItemAmountValues(item);

  const form = useForm<MealItemAmountValues>({
    defaultValues: currentValues,
    resolver: zodResolver(mealItemAmountSchema),
    values: isEditing ? currentValues : undefined,
  });

  const startEditing = () => setIsEditing(true);
  const cancelEditing = () => setIsEditing(false);

  const handleSave = async (values: MealItemAmountValues) => {
    const body = mealItemToUpdateRequest(values);

    if (Object.keys(body).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMealItem({
        body,
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
          <MealItemAmountFields control={form.control} />
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
