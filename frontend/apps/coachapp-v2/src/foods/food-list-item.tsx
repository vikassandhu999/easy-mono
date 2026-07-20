import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight, HandPlatter} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {Food} from '@/api/generated';

type NumericFoodKey = 'protein_g_per_100g' | 'carbs_g_per_100g' | 'fat_g_per_100g';

const MACRO_DISPLAY: {key: NumericFoodKey; label: string}[] = [
  {key: 'protein_g_per_100g', label: 'P'},
  {key: 'carbs_g_per_100g', label: 'C'},
  {key: 'fat_g_per_100g', label: 'F'},
];

const MACRO_CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

function formatMacro(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function getSubtitle(food: Food, isSystem: boolean): string {
  if (food.category && isSystem) {
    return `${food.category} · system`;
  }
  if (food.category) {
    return `${food.category} · custom`;
  }
  if (isSystem) {
    return 'system';
  }
  return 'custom';
}

export default function FoodListItem({food}: {food: Food}) {
  const isSystem = food.source === 'system';
  const kcal = food.calories_per_100g;

  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'gap-3 rounded-none border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
      )}
      id={food.id}
      textValue={food.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        {food.image_url ? (
          <img
            alt={food.name}
            className="size-11 rounded-xl object-cover"
            src={food.image_url}
          />
        ) : (
          <HandPlatter className="size-5 text-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{food.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">{getSubtitle(food, isSystem)}</Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {kcal != null && (
          <Chip
            className={MACRO_CHIP_CLASS}
            size="sm"
            variant="secondary"
          >
            {Math.round(kcal)} cal
          </Chip>
        )}
        {MACRO_DISPLAY.map((macro) => {
          const value = food[macro.key];
          if (value == null) {
            return null;
          }
          return (
            <Chip
              className={cn(MACRO_CHIP_CLASS, 'hidden sm:inline-flex')}
              key={macro.key}
              size="sm"
              variant="secondary"
            >
              {macro.label} {formatMacro(value)}
            </Chip>
          );
        })}
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
