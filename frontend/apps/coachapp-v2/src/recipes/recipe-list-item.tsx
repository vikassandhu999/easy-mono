import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChefHat, ChevronRight} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import type {Recipe} from '@/api/generated';

const CHIP_CLASS = 'shrink-0 rounded-chip border border-border bg-surface font-semibold text-foreground';

export default function RecipeListItem({recipe}: {recipe: Recipe}) {
  const ingredientCount = recipe.recipe_ingredients.length;
  const kcal = recipe.nutrition?.calories;

  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'gap-3 rounded-none border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
      )}
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
            className={CHIP_CLASS}
            size="sm"
            variant="secondary"
          >
            {Math.round(kcal)} Cal
          </Chip>
        )}
        {ingredientCount > 0 && (
          <Chip
            className={cn(CHIP_CLASS, 'hidden sm:inline-flex')}
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
