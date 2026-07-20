import {Chip} from '@heroui/react';
import {cn} from '@heroui/styles';
import {HandPlatter} from 'lucide-react';

import {BrowseRow, BrowseRowThumb, OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import type {Food} from '@/api/generated';

type NumericFoodKey = 'protein_g_per_100g' | 'carbs_g_per_100g' | 'fat_g_per_100g';

const MACRO_DISPLAY: {key: NumericFoodKey; label: string}[] = [
  {key: 'protein_g_per_100g', label: 'P'},
  {key: 'carbs_g_per_100g', label: 'C'},
  {key: 'fat_g_per_100g', label: 'F'},
];

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
    <BrowseRow
      icon={
        <BrowseRowThumb
          alt={food.name}
          fallback={<HandPlatter className="size-5 text-foreground" />}
          src={food.image_url}
        />
      }
      id={food.id}
      meta={getSubtitle(food, isSystem)}
      textValue={food.name}
      title={food.name}
      trailing={
        <>
          {kcal != null && (
            <Chip
              className={OUTLINE_CHIP_CLASS}
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
                className={cn(OUTLINE_CHIP_CLASS, 'hidden sm:inline-flex')}
                key={macro.key}
                size="sm"
                variant="secondary"
              >
                {macro.label} {formatMacro(value)}
              </Chip>
            );
          })}
        </>
      }
    />
  );
}
