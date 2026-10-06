import {useEffect, useState} from 'react';
import {type Food, useFoods} from '../api/foods';
import type {NutritionMealItem} from '../api/nutrition-plans';
import {defaultPortion, portionLabel} from '../api/nutrition-values';
import {type Recipe, useRecipes} from '../api/recipes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FoodMediaPreview} from '../ui/food-media-preview';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';

export function FoodPicker({onAdd, onClose}: {onAdd: (items: NutritionMealItem[]) => void; onClose: () => void}) {
  const [kind, setKind] = useState<'food' | 'recipe'>('food');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Map<string, NutritionMealItem>());
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft]);
  function row(item: Food | Recipe) {
    const key = `${kind}:${item.id}`;
    return (
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium">{item.name}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {portionLabel(defaultPortion(item))}
              {'brand' in item && item.brand ? ` · ${item.brand}` : ''}
            </p>
            {item.allergens.length > 0 && (
              <p className="mt-1 break-words text-xs text-muted-foreground">Allergens: {item.allergens.join(', ')}</p>
            )}
          </div>
          <Button
            variant="outline"
            aria-label={`Select ${item.name}`}
            aria-pressed={selected.has(key)}
            onPress={() =>
              setSelected((previous) => {
                const next = new Map(previous);
                if (next.has(key)) {
                  next.delete(key);
                } else {
                  next.set(key, {
                    id: crypto.randomUUID(),
                    source: {type: kind, id: item.id},
                    name: item.name,
                    portion: defaultPortion(item),
                  });
                }
                return next;
              })
            }
          >
            {selected.has(key) ? 'Selected' : 'Select'}
          </Button>
        </div>
        {'media' in item && <FoodMediaPreview food={item} />}
      </div>
    );
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Add foods or recipes</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <div
          className="flex gap-2"
          role="group"
          aria-label="Library type"
        >
          <Button
            variant={kind === 'food' ? 'secondary' : 'ghost'}
            aria-pressed={kind === 'food'}
            onPress={() => setKind('food')}
          >
            Foods
          </Button>
          <Button
            variant={kind === 'recipe' ? 'secondary' : 'ghost'}
            aria-pressed={kind === 'recipe'}
            onPress={() => setKind('recipe')}
          >
            Recipes
          </Button>
        </div>
        <label
          htmlFor="nutrition-food-search"
          className="grid gap-2 text-sm"
        >
          Search {kind === 'food' ? 'foods' : 'recipes'}
          <Input
            id="nutrition-food-search"
            autoFocus
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        {kind === 'food' ? <Foods search={search}>{row}</Foods> : <Recipes search={search}>{row}</Recipes>}
      </div>
      <div className="space-y-2 border-t border-border p-4">
        {selected.size > 0 && (
          <p className="max-h-16 overflow-y-auto break-words text-sm text-muted-foreground">
            {[...selected.values()].map((item) => item.name).join(' · ')}
          </p>
        )}
        <div className="flex justify-between gap-3">
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            isDisabled={selected.size === 0}
            onPress={() => onAdd([...selected.values()])}
          >
            Add {selected.size || ''} {selected.size === 1 ? 'item' : 'items'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
function Foods({search, children}: {search: string; children: (item: Food) => React.ReactNode}) {
  return (
    <InfiniteList
      query={useFoods({search})}
      label="foods"
      singular="food"
      empty={<p>No matching foods. Try another name.</p>}
    >
      {children}
    </InfiniteList>
  );
}
function Recipes({search, children}: {search: string; children: (item: Recipe) => React.ReactNode}) {
  return (
    <InfiniteList
      query={useRecipes(search)}
      label="recipes"
      singular="recipe"
      empty={<p>No matching recipes. Try another name or choose Foods.</p>}
    >
      {children}
    </InfiniteList>
  );
}
