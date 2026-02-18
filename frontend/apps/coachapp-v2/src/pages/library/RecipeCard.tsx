import { Card } from "@heroui/react";
import { ChefHat, Clock, Flame, Leaf } from "lucide-react";

import type { Recipe } from "@/api/recipes";

import { formatDate, formatMacros } from "@/pages/library/libraryShared";

type RecipeCardProps = {
  onEdit: (recipe: Recipe) => void;
  recipe: Recipe;
};

export default function RecipeCard({ onEdit, recipe }: RecipeCardProps) {
  const macros = formatMacros(recipe.macros);
  const ingredientCount = recipe.recipe_ingredients?.length ?? 0;
  const ingredientNames = recipe.recipe_ingredients
    ?.map((ingredient) => ingredient.food?.name)
    .filter(Boolean)
    .slice(0, 2);
  const defaultServing = recipe.serving_sizes?.[0];
  const servingText = defaultServing
    ? `${defaultServing.amount ?? ""} ${defaultServing.unit ?? "serving"}`.trim()
    : "1 serving";

  return (
    <Card
      className="h-full cursor-pointer border border-separator bg-surface p-4 text-left transition-none hover:bg-surface-secondary"
      onClick={() => onEdit(recipe)}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <ChefHat className="h-5 w-5 text-accent" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">
                {recipe.name}
              </span>
              <span className="truncate text-sm text-muted">Recipe</span>
            </div>
          </div>
        </div>

        {macros ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Cal</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.calories)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Pro</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.protein)}g
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Carb</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.carbs)}g
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Fat</span>
              <span className="font-semibold text-foreground">
                {Math.round(macros.fat)}g
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4" />
            <span>{ingredientCount} ingredients</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{servingText}</span>
          </div>
        </div>

        {ingredientNames && ingredientNames.length > 0 ? (
          <p className="text-xs text-muted">
            Includes: {ingredientNames.join(", ")}
          </p>
        ) : null}

        <div className="min-h-6">
          {recipe.tags && recipe.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 ? (
                <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                  +{recipe.tags.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-separator pt-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted">
            <Flame className="h-4 w-4" />
            <span>{formatDate(recipe.updated_at)}</span>
          </div>
          <span className="text-xs text-muted">Tap to edit</span>
        </div>
      </div>
    </Card>
  );
}
