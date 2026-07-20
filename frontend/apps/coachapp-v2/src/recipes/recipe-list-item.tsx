import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChefHat, ChevronRight} from 'lucide-react';

import {LIST_ITEM_CLASS, OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import type {Recipe} from '@/api/generated';

export default function RecipeListItem({recipe}: {recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const kcal = recipe.nutrition?.calories;

  return (
    <ListBox.Item
      className={LIST_ITEM_CLASS}
      id={recipe.id}
      textValue={recipe.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        <ChefHat className="size-5 text-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{recipe.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">
          {ingredientCount} ingredient{ingredientCount === 1 ? '' : 's'}
        </Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
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
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
