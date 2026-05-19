import {Chip} from '@heroui/react';
import {Apple} from 'lucide-react';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';

import type {Food} from '@/api/foods';

import {normalizeMacros} from '@/api/shared';

const MACRO_DISPLAY: {key: string; label: string; unit: string}[] = [
  {key: 'calories_per_100g', label: 'Cal', unit: ''},
  {key: 'protein_g', label: 'P', unit: 'g'},
  {key: 'carbs_g', label: 'C', unit: 'g'},
  {key: 'fats_g', label: 'F', unit: 'g'},
];

export default function FoodCard({food}: {food: Food}) {
  const normalized = useMemo(() => normalizeMacros(food.macros), [food.macros]);
  const hasMacros = Object.keys(food.macros).length > 0;
  const isSystem = food.source === 'system';

  // Build subtitle: category + "system" badge
  const subtitle = food.category
    ? isSystem
      ? `${food.category} · system`
      : food.category
    : isSystem
      ? 'system'
      : null;

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/library/foods/${food.id}`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        {food.image_url ? (
          <img
            alt={food.name}
            className="size-10 rounded-lg object-cover"
            src={food.image_url}
          />
        ) : (
          <Apple
            className="text-foreground-400"
            size={20}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{food.name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-foreground-500">
            {food.category ?? ''}
            {food.category && isSystem && <span className="text-foreground-400"> · system</span>}
            {!food.category && isSystem && <span className="text-foreground-400">system</span>}
          </p>
        ) : (
          <p className="text-xs text-foreground-400">No category</p>
        )}
      </div>

      {hasMacros && (
        <div className="hidden gap-1.5 sm:flex">
          {MACRO_DISPLAY.map((macro) => {
            const value = normalized[macro.key];
            if (value === undefined) return null;
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
    </Link>
  );
}
