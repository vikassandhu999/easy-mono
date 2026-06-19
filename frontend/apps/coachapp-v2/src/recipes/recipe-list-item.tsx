import {Chip, Description, Label, ListBox} from '@heroui/react';
import {ChefHat} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {Recipe} from '@/api/recipes';

function getRecipeSubtitle(recipe: Recipe): string {
  const ingredientCount = recipe.recipe_ingredients.length;

  if (recipe.category) {
    return recipe.category;
  }
  if (ingredientCount > 0) {
    return `${ingredientCount} ingredient${ingredientCount !== 1 ? 's' : ''}`;
  }
  return 'No category';
}

export default function RecipeListItem({recipe}: {recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const calories = recipe.macros.calories_per_100g;

  return (
    <ListBox.Item
      className={LIST_ITEM_CLASS}
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
    </ListBox.Item>
  );
}
