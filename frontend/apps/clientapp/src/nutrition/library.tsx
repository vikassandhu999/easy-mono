import {Plus} from 'lucide-react';
import {useState} from 'react';
import {type Food, type NutritionPortion, type Recipe, useFoods, useRecipes} from '../api/nutrition';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {libraryPortions, portionNutrients} from './library-portions';
import {Nutrients} from './nutrition';

type PickItem = (kind: 'food' | 'recipe', item: Food | Recipe, portion: NutritionPortion) => void;
export function FoodPicker({onPick, onClose}: {onPick: PickItem; onClose: () => void}) {
  const [kind, setKind] = useState<'food' | 'recipe'>('food');
  const [search, setSearch] = useState('');
  return (
    <BottomSheet
      title="Choose food or recipe"
      onClose={onClose}
    >
      <section
        className="space-y-4"
        aria-label="Choose food or recipe"
      >
        <SelectField
          aria-label="Item type"
          value={kind}
          onChange={(value) => setKind(value === 'recipe' ? 'recipe' : 'food')}
        >
          <SelectItem id="food">Foods</SelectItem>
          <SelectItem id="recipe">Recipes</SelectItem>
        </SelectField>
        <form
          className="flex items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(String(new FormData(event.currentTarget).get('search') ?? ''));
          }}
        >
          <label className="grid gap-2 flex-1 min-w-0">
            Search library
            <input
              name="search"
              type="search"
              className="h-12 w-full rounded-xl border border-border px-3 text-base"
              defaultValue={search}
            />
          </label>
          <Button
            type="submit"
            variant="outline"
          >
            Search
          </Button>
        </form>
        {kind === 'food' ? (
          <Foods
            search={search}
            onPick={onPick}
          />
        ) : (
          <Recipes
            search={search}
            onPick={onPick}
          />
        )}
      </section>
    </BottomSheet>
  );
}
function Foods({search, onPick}: {search: string; onPick: PickItem}) {
  const query = useFoods(search);
  return (
    <InfiniteList
      query={query}
      label="foods"
      singular="food"
      empty={<p>No foods match this search.</p>}
    >
      {(item) => (
        <LibraryItem
          item={item}
          kind="food"
          onPick={onPick}
        />
      )}
    </InfiniteList>
  );
}
function Recipes({search, onPick}: {search: string; onPick: PickItem}) {
  const query = useRecipes(search);
  return (
    <InfiniteList
      query={query}
      label="recipes"
      singular="recipe"
      empty={<p>No recipes match this search.</p>}
    >
      {(item) => (
        <LibraryItem
          item={item}
          kind="recipe"
          onPick={onPick}
        />
      )}
    </InfiniteList>
  );
}
function LibraryItem({item, kind, onPick}: {item: Food | Recipe; kind: 'food' | 'recipe'; onPick: PickItem}) {
  const [selected, setSelected] = useState('0');
  const options = libraryPortions(item);
  const option = options[Number(selected)] ?? options[0];
  if (!option) {
    return null;
  }
  const portion = option.portion;
  return (
    <div className="py-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{option.label}</p>
        </div>
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Choose ${item.name}`}
          onPress={() => onPick(kind, item, portion)}
        >
          <Plus
            className="size-5"
            aria-hidden="true"
          />
        </Button>
      </div>
      <details>
        <summary className="min-h-11 py-3 cursor-pointer text-sm font-semibold">Portion & item details</summary>
        <div className="space-y-3 py-3">
          <SelectField
            aria-label={`Portion for ${item.name}`}
            value={selected}
            onChange={(value) => setSelected(String(value))}
          >
            {options.map((option, index) => (
              <SelectItem
                key={index}
                id={String(index)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
          <Nutrients
            label={`For ${option.label}`}
            value={portionNutrients(item.nutrients, option.grams)}
          />
          {'allergens' in item && item.allergens.length > 0 && <p>Allergens: {item.allergens.join(', ')}</p>}
          {'notes' in item && item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
          {'instructions' in item && item.instructions && <p className="whitespace-pre-wrap">{item.instructions}</p>}
          {'description' in item && item.description && <p>{item.description}</p>}
        </div>
      </details>
    </div>
  );
}
