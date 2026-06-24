import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {HandPlatter} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {Food} from '@/api/generated';

type NumericFoodKey = 'calories_per_100g' | 'protein_g_per_100g' | 'carbs_g_per_100g' | 'fat_g_per_100g';

const MACRO_DISPLAY: {key: NumericFoodKey; label: string; unit: string}[] = [
  {key: 'calories_per_100g', label: 'Cal', unit: ''},
  {key: 'protein_g_per_100g', label: 'P', unit: 'g'},
  {key: 'carbs_g_per_100g', label: 'C', unit: 'g'},
  {key: 'fat_g_per_100g', label: 'F', unit: 'g'},
];

function getSubtitle(food: Food, isSystem: boolean): string {
  if (food.category && isSystem) {
    return `${food.category} · system`;
  }
  if (food.category) {
    return food.category;
  }
  if (isSystem) {
    return 'system';
  }
  return 'No category';
}

export default function FoodListItem({food}: {food: Food}) {
  const hasMacros = MACRO_DISPLAY.some(({key}) => food[key] != null);
  const isSystem = food.source === 'system';

  return (
    <ListBox.Item
      className={cn(LIST_ITEM_CLASS, 'hover:bg-surface-secondary-hover')}
      id={food.id}
      textValue={food.name}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        {food.image_url ? (
          <img
            alt={food.name}
            className="size-10 rounded-lg object-cover"
            src={food.image_url}
          />
        ) : (
          <HandPlatter />
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{food.name}</Label>
        <Description className="truncate">{getSubtitle(food, isSystem)}</Description>
      </div>

      {hasMacros && (
        <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
          {MACRO_DISPLAY.map((macro) => {
            const value = food[macro.key];
            if (value == null) {
              return null;
            }
            return (
              <Chip
                key={macro.key}
                size="sm"
                variant="soft"
              >
                {macro.label} {value}
                {macro.unit}
              </Chip>
            );
          })}
        </div>
      )}
    </ListBox.Item>
  );
}
