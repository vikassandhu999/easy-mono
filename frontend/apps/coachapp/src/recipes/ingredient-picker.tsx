import {useEffect, useState} from 'react';
import {type Food, useFoods} from '../api/foods';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';

export function IngredientPicker({onAdd, onClose}: {onAdd: (foods: Food[]) => void; onClose: () => void}) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Map<string, Food>());
  const query = useFoods(search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft]);
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
        <DialogTitle>Add ingredients</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label
          className="grid gap-2 text-sm"
          htmlFor="ingredient-search"
        >
          Search foods
          <Input
            id="ingredient-search"
            autoFocus
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <InfiniteList
          query={query}
          label="foods"
          singular="food"
          empty={<p>No matching foods. Try another name. New foods can be created in the Food library.</p>}
        >
          {(food) => (
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{food.name}</p>
                {food.brand && <p className="text-sm text-muted-foreground">{food.brand}</p>}
                {food.allergens.length > 0 && (
                  <p className="text-xs text-muted-foreground">Allergens: {food.allergens.join(', ')}</p>
                )}
              </div>
              <Button
                variant="outline"
                aria-label={`Select ${food.name}`}
                aria-pressed={selected.has(food.id)}
                onPress={() =>
                  setSelected((previous) => {
                    const next = new Map(previous);
                    if (next.has(food.id)) {
                      next.delete(food.id);
                    } else {
                      next.set(food.id, food);
                    }
                    return next;
                  })
                }
              >
                {selected.has(food.id) ? 'Selected' : 'Select'}
              </Button>
            </div>
          )}
        </InfiniteList>
      </div>
      <div className="space-y-3 border-t border-border p-4">
        {selected.size > 0 && (
          <p className="max-h-16 overflow-y-auto text-sm text-muted-foreground">
            {[...selected.values()].map((food) => food.name).join(' · ')}
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
            Add {selected.size || ''} {selected.size === 1 ? 'ingredient' : 'ingredients'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
