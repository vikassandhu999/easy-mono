import {Button} from '@heroui/react';
import {Apple, ChevronDown, ChevronRight, ChevronUp, CookingPot} from 'lucide-react';

import type {MealItem} from '@/entities/meals/api/meals';

type MealItemCardProps = {
  canMove: {down: boolean; up: boolean};
  item: MealItem;
  itemName: string;
  onMove: (direction: 'down' | 'up') => void;
  onTap: () => void;
};

function getItemSummary(item: MealItem): string {
  const parts: string[] = [];
  if (item.amount != null) {
    const unit = item.unit ?? '';
    parts.push(`${item.amount}${unit ? ` ${unit}` : ''}`);
  }
  if (item.weight_g != null) {
    parts.push(`${item.weight_g}g`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No details';
}

export function MealItemCard({canMove, item, itemName, onMove, onTap}: MealItemCardProps) {
  const isFood = Boolean(item.food_id);
  const ItemIcon = isFood ? Apple : CookingPot;

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <div className="flex flex-col">
        <Button
          aria-label="Move item up"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.up}
          isIconOnly
          onPress={() => onMove('up')}
          size="sm"
          variant="ghost"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label="Move item down"
          className="min-h-7 min-w-7"
          isDisabled={!canMove.down}
          isIconOnly
          onPress={() => onMove('down')}
          size="sm"
          variant="ghost"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <button
        className="flex flex-1 cursor-pointer items-center gap-3 border-none bg-transparent py-2 text-left outline-none"
        onClick={onTap}
        type="button"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
          <ItemIcon className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{itemName}</p>
          <p className="text-xs text-muted">{getItemSummary(item)}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </button>
    </div>
  );
}
