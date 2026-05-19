import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChefHat} from 'lucide-react';

import type {Recipe} from '@/api/recipes';

function getRecipeSubtitle(recipe: Recipe): string {
  const ingredientCount = recipe.recipe_ingredients.length;

  if (recipe.category) return recipe.category;
  if (ingredientCount > 0) return `${ingredientCount} ingredient${ingredientCount !== 1 ? 's' : ''}`;
  return 'No category';
}

export default function RecipeListItem({className, recipe}: {className?: string; recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const calories = recipe.macros.calories_per_100g;

  return (
    <ListBox.Item
      className={cn('min-h-fit rounded-none px-4 py-2 sm:px-8', className)}
      id={recipe.id}
      textValue={recipe.name}
    >
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

      <div className="flex min-w-0 flex-col">
        <Label className="truncate">{recipe.name}</Label>
        <Description className="truncate">{getRecipeSubtitle(recipe)}</Description>
      </div>

      <div className="ms-auto hidden shrink-0 gap-1.5 sm:flex">
        {calories !== undefined && (
          <Chip
            size="sm"
            variant="soft"
          >
            {calories} Cal
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-0 border-t-[0.5px] border-divider/70 sm:inset-x-8"
      />
    </ListBox.Item>
  );
}
