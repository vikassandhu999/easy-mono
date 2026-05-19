import {Button, Input, toast} from '@heroui/react';
import {Apple, Check, ChefHat, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {MealItem} from '@/api/meals';

import {useUpdateMealItemMutation} from '@/api/meals';

type MealItemRowProps = {
  item: MealItem;
  mealId: string;
  planId: string;
  onRemove: (itemId: string) => void;
  isRemoving: boolean;
};

export default function MealItemRow({item, mealId, planId, onRemove, isRemoving}: MealItemRowProps) {
  const isRecipe = Boolean(item.recipe_id);
  const Icon = isRecipe ? ChefHat : Apple;
  const name = isRecipe ? item.recipe?.name : item.food?.name;
  const imageUrl = isRecipe ? item.recipe?.image_url : item.food?.image_url;

  const [updateMealItem, {isLoading: isSaving}] = useUpdateMealItemMutation();

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editWeightG, setEditWeightG] = useState('');

  const startEditing = useCallback(() => {
    setEditAmount(item.amount != null ? String(item.amount) : '');
    setEditUnit(item.unit ?? '');
    setEditWeightG(item.weight_g != null ? String(item.weight_g) : '');
    setIsEditing(true);
  }, [item.amount, item.unit, item.weight_g]);

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    const amt = editAmount.trim() ? Number(editAmount) : undefined;
    const u = editUnit.trim() || undefined;
    const wg = editWeightG.trim() ? Number(editWeightG) : undefined;

    // If all empty, cancel instead
    if (amt === undefined && u === undefined && wg === undefined) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMealItem({
        id: item.id,
        mealId,
        planId,
        body: {
          ...(amt !== undefined ? {amount: amt} : {}),
          ...(u !== undefined ? {unit: u} : {}),
          ...(wg !== undefined ? {weight_g: wg} : {}),
        },
      }).unwrap();
      setIsEditing(false);
    } catch {
      toast.danger('Failed to update amounts.');
    }
  };

  const details: string[] = [];
  if (item.amount != null) details.push(`${item.amount}${item.unit ? ` ${item.unit}` : ''}`);
  if (item.weight_g != null) details.push(`${item.weight_g}g`);

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
          <p className="min-w-0 truncate text-sm font-medium">{name ?? (isRecipe ? 'Recipe' : 'Food')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-foreground-400"
              htmlFor={`edit-amt-${item.id}`}
            >
              Amount
            </label>
            <Input
              id={`edit-amt-${item.id}`}
              inputMode="decimal"
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') cancelEditing();
              }}
              placeholder="1"
              type="number"
              value={editAmount}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-foreground-400"
              htmlFor={`edit-unit-${item.id}`}
            >
              Unit
            </label>
            <Input
              id={`edit-unit-${item.id}`}
              onChange={(e) => setEditUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') cancelEditing();
              }}
              placeholder="serving"
              value={editUnit}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-foreground-400"
              htmlFor={`edit-wg-${item.id}`}
            >
              Weight (g)
            </label>
            <Input
              id={`edit-wg-${item.id}`}
              inputMode="decimal"
              onChange={(e) => setEditWeightG(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') cancelEditing();
              }}
              placeholder="100"
              type="number"
              value={editWeightG}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            isPending={isSaving}
            onPress={handleSave}
            size="sm"
          >
            <Check size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onPress={cancelEditing}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
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
        <p className="truncate text-sm font-medium">{name ?? (isRecipe ? 'Recipe' : 'Food')}</p>
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
