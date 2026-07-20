import {Chip} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChefHat} from 'lucide-react';

import {BrowseRow, OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import type {Recipe} from '@/api/generated';

export default function RecipeListItem({recipe}: {recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const kcal = recipe.nutrition?.calories;

  return (
    <BrowseRow
      icon={<ChefHat className="size-5 text-foreground" />}
      id={recipe.id}
      meta={`${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'}`}
      textValue={recipe.name}
      title={recipe.name}
      trailing={
        <>
          {kcal != null && (
            <Chip
              className={OUTLINE_CHIP_CLASS}
              size="sm"
              variant="secondary"
            >
              {Math.round(kcal)} Cal
            </Chip>
          )}
          {ingredientCount > 0 && (
            <Chip
              className={cn(OUTLINE_CHIP_CLASS, 'hidden sm:inline-flex')}
              size="sm"
              variant="secondary"
            >
              {ingredientCount} item{ingredientCount === 1 ? '' : 's'}
            </Chip>
          )}
        </>
      }
    />
  );
}
