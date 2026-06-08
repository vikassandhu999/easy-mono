import {normalizeMacros} from '@easy/utils';
import {ListBox, SearchField} from '@heroui/react';
import {useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useListClientFoodsQuery} from '@/api/foods';
import {useListClientRecipesQuery} from '@/api/recipes';

// ── Types ───────────────────────────────────────────────────

export type PickedServingSize = {
  amount: null | number;
  unit: string;
  weight_g: null | number;
};

export type PickedItem = {
  id: string;
  macros: null | Record<string, number>;
  name: string;
  serving_sizes: PickedServingSize[];
  type: 'food' | 'recipe';
};

// ── Helpers ─────────────────────────────────────────────────

function getCalorieDisplay(macros: null | Record<string, number>): string {
  if (!macros) {
    return '';
  }
  const normalized = normalizeMacros(macros);
  const cal = normalized.calories_per_100g;
  if (cal == null) {
    return '';
  }
  return `${Math.round(cal)} cal/100g`;
}

function getProteinDisplay(macros: null | Record<string, number>): string {
  if (!macros) {
    return '';
  }
  const normalized = normalizeMacros(macros);
  const protein = normalized.protein_g;
  if (protein == null) {
    return '';
  }
  return `${Math.round(protein)}g protein`;
}

// ── Component ───────────────────────────────────────────────

export default function FoodSearchPicker({onSelect}: {onSelect: (item: PickedItem) => void}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const shouldQuery = debouncedSearch.length >= 2;

  const {data: foodsData, isFetching: isFetchingFoods} = useListClientFoodsQuery(
    shouldQuery ? {limit: 10, search: debouncedSearch} : undefined,
    {skip: !shouldQuery},
  );
  const {data: recipesData, isFetching: isFetchingRecipes} = useListClientRecipesQuery(
    shouldQuery ? {limit: 10, search: debouncedSearch} : undefined,
    {skip: !shouldQuery},
  );

  const isFetching = isFetchingFoods || isFetchingRecipes;

  const items: PickedItem[] = useMemo(() => {
    const result: PickedItem[] = [];
    if (foodsData) {
      for (const food of foodsData.data) {
        result.push({
          id: food.id,
          macros: food.macros,
          name: food.name,
          serving_sizes: food.serving_sizes ?? [],
          type: 'food',
        });
      }
    }
    if (recipesData) {
      for (const recipe of recipesData.data) {
        result.push({
          id: recipe.id,
          macros: recipe.macros,
          name: recipe.name,
          serving_sizes: recipe.serving_sizes ?? [],
          type: 'recipe',
        });
      }
    }
    return result;
  }, [foodsData, recipesData]);

  return (
    <div className="flex flex-col gap-2">
      <SearchField
        aria-label="Search foods and recipes"
        onChange={setSearch}
        value={search}
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search foods or recipes..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {shouldQuery && !isFetching && items.length === 0 ? (
        <p className="px-2 py-3 text-center text-sm text-foreground-400">No results found.</p>
      ) : null}

      {items.length > 0 ? (
        <ListBox
          aria-label="Search results"
          onAction={(key) => {
            const item = items.find((i) => i.id === key);
            if (item) {
              onSelect(item);
            }
          }}
        >
          {items.map((item) => (
            <ListBox.Item
              id={item.id}
              key={item.id}
              textValue={item.name}
            >
              <div className="flex min-h-11 items-center gap-3 py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-foreground-400">
                    {item.type === 'recipe' ? 'Recipe' : 'Food'}
                    {getCalorieDisplay(item.macros) ? ` \u00B7 ${getCalorieDisplay(item.macros)}` : ''}
                    {getProteinDisplay(item.macros) ? ` \u00B7 ${getProteinDisplay(item.macros)}` : ''}
                  </p>
                </div>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      ) : null}

      {isFetching ? <p className="px-2 py-3 text-center text-sm text-foreground-400">Searching...</p> : null}
    </div>
  );
}
