/**
 * One row in the add-items picker list: checkbox visual · name · per-100g or
 * per-serving line · protein badge. Pure presentation; the flow owns state.
 */
import {Chip} from '@heroui/react';

import type {Food, Recipe} from '@/api/nutrition-foods';
import {recipeServings} from '@/recipes/lib/recipe-math';

import {fmt} from './format';

export type FoodOrRecipe = Food | Recipe;

/** Type guard: is the item a Recipe (has `recipe_ingredients`)? */
export function isRecipe(item: FoodOrRecipe): item is Recipe {
  return 'recipe_ingredients' in item;
}

function perServingCalories(recipe: Recipe): number | null | undefined {
  const kcal = recipe.nutrition?.calories;
  return kcal == null ? kcal : kcal / recipeServings(recipe);
}

/** Protein badge — per 100g for foods, per serving for recipes. e.g. "80P". */
function macroBadge(item: FoodOrRecipe): string {
  if (isRecipe(item)) {
    const protein = item.nutrition?.protein_g;
    return `${fmt(protein == null ? protein : protein / recipeServings(item))}P`;
  }
  return `${fmt(item.protein_g_per_100g)}P`;
}

export function PickerItemRow({item, isSelected}: {item: FoodOrRecipe; isSelected: boolean}) {
  return (
    <div className="flex items-center gap-2">
      {/* Decorative: the row Button owns the press and announces state via aria-pressed. */}
      <div
        aria-hidden="true"
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-chip border',
          isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-default',
        ].join(' ')}
      >
        {isSelected ? <span className="type-eyebrow font-bold leading-none">✓</span> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate type-body font-medium text-foreground">{item.name}</div>
        <div className="truncate type-eyebrow text-muted">
          {isRecipe(item)
            ? // Recipe totals cover servings_count servings; without one the
              // whole recipe is a single serving — label accordingly.
              `${(item.servings_count ?? 0) > 0 ? 'per srv' : 'per recipe'} · ${fmt(perServingCalories(item))} kcal`
            : `per 100g · ${fmt(item.calories_per_100g)} kcal`}
        </div>
      </div>

      <Chip
        className="shrink-0"
        color="accent"
        size="sm"
        variant="secondary"
      >
        {macroBadge(item)}
      </Chip>
    </div>
  );
}
