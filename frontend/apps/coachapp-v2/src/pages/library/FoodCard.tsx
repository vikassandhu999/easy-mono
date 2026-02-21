import {Apple, Ruler, Tag} from 'lucide-react';

import type {Food} from '@/api/foods';

import LibraryCard from '@/components/LibraryCard';
import {formatDate, formatMacros} from '@/pages/library/libraryShared';

type FoodCardProps = {
  food: Food;
  onEdit: (food: Food) => void;
};

export default function FoodCard({food, onEdit}: FoodCardProps) {
  const macros = formatMacros(food.macros);
  const servingCount = food.serving_sizes?.length ?? 1;
  const defaultServing = food.serving_sizes?.[0];
  const servingText = defaultServing
    ? `${defaultServing.amount ?? 1} ${defaultServing.unit ?? 'serving'}`.trim()
    : '1 serving';

  return (
    <LibraryCard
      icon={<Apple className="h-5 w-5 text-accent" />}
      meta={{
        date: formatDate(food.updated_at),
        hint: 'Tap to edit',
      }}
      onPress={() => onEdit(food)}
      subtitle="Food / Ingredient"
      title={food.name}
    >
      {macros ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Cal</span>
            <span className="font-semibold text-foreground">{Math.round(macros.calories)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Pro</span>
            <span className="font-semibold text-foreground">{Math.round(macros.protein)}g</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Carb</span>
            <span className="font-semibold text-foreground">{Math.round(macros.carbs)}g</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Fat</span>
            <span className="font-semibold text-foreground">{Math.round(macros.fat)}g</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-4 text-sm text-muted">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-4 w-4" />
          <span>
            {servingCount} serving{servingCount > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag className="h-4 w-4" />
          <span>{servingText}</span>
        </div>
      </div>

      <div className="min-h-6">
        {food.tags && food.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {food.tags.slice(0, 3).map((tag) => (
              <span
                className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))}
            {food.tags.length > 3 ? (
              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                +{food.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : food.category ? (
          <div className="flex flex-wrap gap-1">
            <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">{food.category}</span>
          </div>
        ) : null}
      </div>
    </LibraryCard>
  );
}
