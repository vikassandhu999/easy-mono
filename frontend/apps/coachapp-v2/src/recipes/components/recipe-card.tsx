import {Chip} from '@heroui/react';
import {ChefHat} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {Recipe} from '@/api/recipes';

export default function RecipeCard({recipe}: {recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const cal = recipe.macros.calories_per_100g;

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2 sm:p-4"
      to={`/library/recipes/${recipe.id}`}
    >
      {/* Icon / image */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-content2">
        {recipe.image_url ? (
          <img
            alt={recipe.name}
            className="size-10 rounded-lg object-cover"
            src={recipe.image_url}
          />
        ) : (
          <ChefHat
            className="text-foreground-400"
            size={20}
          />
        )}
      </div>

      {/* Name + category */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{recipe.name}</p>
        {recipe.category ? (
          <p className="truncate text-xs text-foreground-500">{recipe.category}</p>
        ) : ingredientCount > 0 ? (
          <p className="text-xs text-foreground-500">
            {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-xs text-foreground-400">No category</p>
        )}
      </div>

      {/* Summary chips — hidden on small screens */}
      <div className="hidden gap-1.5 sm:flex">
        {cal !== undefined && (
          <Chip
            size="sm"
            variant="soft"
          >
            {cal} Cal
          </Chip>
        )}
        {ingredientCount > 0 && (
          <Chip
            color="default"
            size="sm"
            variant="soft"
          >
            {ingredientCount} item{ingredientCount !== 1 ? 's' : ''}
          </Chip>
        )}
      </div>
    </Link>
  );
}
