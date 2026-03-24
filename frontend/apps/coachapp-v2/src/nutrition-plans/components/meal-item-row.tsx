import {Button} from '@heroui/react';
import {Apple, ChefHat, Trash2} from 'lucide-react';

import type {MealItem} from '@/api/meals';

type MealItemRowProps = {
  item: MealItem;
  onRemove: (itemId: string) => void;
  isRemoving: boolean;
};

/**
 * A single food/recipe row inside a meal section.
 * Shows icon, resolved name, amounts, and a remove button.
 */
export default function MealItemRow({item, onRemove, isRemoving}: MealItemRowProps) {
  const isRecipe = Boolean(item.recipe_id);
  const Icon = isRecipe ? ChefHat : Apple;
  const name = isRecipe ? item.recipe?.name : item.food?.name;
  const imageUrl = isRecipe ? item.recipe?.image_url : item.food?.image_url;

  const details: string[] = [];
  if (item.amount != null) details.push(`${item.amount}${item.unit ? ` ${item.unit}` : ''}`);
  if (item.weight_g != null) details.push(`${item.weight_g}g`);

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
        {details.length > 0 && <p className="text-xs text-foreground-500">{details.join(' / ')}</p>}
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
