import {useState} from 'react';
import {type Food, type NutritionPortion, type Recipe, useFoods, useRecipes} from '../api/nutrition';
import {Button} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {portionText} from './meal-draft';
import {Nutrients} from './nutrition';

type PickItem = (kind: 'food' | 'recipe', item: Food | Recipe, portion: NutritionPortion) => void;
export function FoodPicker({onPick, onClose}: {onPick: PickItem; onClose: () => void}) {
  const [kind, setKind] = useState<'food' | 'recipe'>('food');
  const [search, setSearch] = useState('');
  return (
    <section
      className="space-y-4"
      aria-label="Choose food or recipe"
    >
      <div className="flex justify-between gap-3 items-center">
        <h2 className="text-xl font-semibold">Choose an item</h2>
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Cancel
        </Button>
      </div>
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
  const [selected, setSelected] = useState('default');
  const portion = item.portion_options[Number(selected)] ?? item.default_portion;
  return (
    <div className="py-5 space-y-3">
      <h3 className="text-lg font-semibold">{item.name}</h3>
      <details>
        <summary className="text-link py-2 cursor-pointer">Item details</summary>
        <div className="space-y-3 py-3">
          <Nutrients
            label={`For ${portionText(item.default_portion)}`}
            value={item.nutrients}
          />
          {item.allergens.length > 0 && <p>Allergens: {item.allergens.join(', ')}</p>}
          {'notes' in item && item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
          {'instructions' in item && item.instructions && <p className="whitespace-pre-wrap">{item.instructions}</p>}
          {'description' in item && item.description && <p>{item.description}</p>}
        </div>
      </details>
      <SelectField
        aria-label={`Portion for ${item.name}`}
        value={selected}
        onChange={(value) => setSelected(String(value))}
      >
        <SelectItem id="default">{portionText(item.default_portion)}</SelectItem>
        {item.portion_options.map((option, index) => (
          <SelectItem
            key={index}
            id={String(index)}
          >
            {portionText(option)}
          </SelectItem>
        ))}
      </SelectField>
      <Button
        variant="outline"
        onPress={() => onPick(kind, item, portion)}
      >
        Choose {item.name}
      </Button>
    </div>
  );
}
