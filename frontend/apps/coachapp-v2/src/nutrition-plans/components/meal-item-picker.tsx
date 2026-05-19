import type {Key} from '@heroui/react';

import {Autocomplete, Button, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Apple, ChefHat} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type Food, useListFoodsQuery} from '@/api/foods';
import {type Recipe, useListRecipesQuery} from '@/api/recipes';
import {normalizeMacros} from '@/api/shared';

type PickerTab = 'food' | 'recipe';

type MealItemPickerProps = {
  onSelectFood: (food: Food) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  excludeFoodIds?: string[];
  excludeRecipeIds?: string[];
};

export default function MealItemPicker({
  onSelectFood,
  onSelectRecipe,
  excludeFoodIds = [],
  excludeRecipeIds = [],
}: MealItemPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('food');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const shouldQuery = debouncedSearch.length >= 1;

  // Food query
  const {data: foodData, isFetching: isFetchingFoods} = useListFoodsQuery(
    shouldQuery && activeTab === 'food' ? {search: debouncedSearch, limit: 10} : undefined,
    {skip: !shouldQuery || activeTab !== 'food'},
  );
  const foods = useMemo(() => foodData?.data ?? [], [foodData]);
  const foodMap = useMemo(() => {
    const map = new Map<string, Food>();
    for (const f of foods) map.set(f.id, f);
    return map;
  }, [foods]);

  // Recipe query
  const {data: recipeData, isFetching: isFetchingRecipes} = useListRecipesQuery(
    shouldQuery && activeTab === 'recipe' ? {search: debouncedSearch, limit: 10} : undefined,
    {skip: !shouldQuery || activeTab !== 'recipe'},
  );
  const recipes = useMemo(() => recipeData?.data ?? [], [recipeData]);
  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const r of recipes) map.set(r.id, r);
    return map;
  }, [recipes]);

  const isFetching = activeTab === 'food' ? isFetchingFoods : isFetchingRecipes;

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) return;
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) return;

      if (activeTab === 'food') {
        const food = foodMap.get(id);
        if (food) {
          onSelectFood(food);
          setSearchInput('');
        }
      } else {
        const recipe = recipeMap.get(id);
        if (recipe) {
          onSelectRecipe(recipe);
          setSearchInput('');
        }
      }
    },
    [activeTab, foodMap, recipeMap, onSelectFood, onSelectRecipe],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <Button
          className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
            activeTab === 'food' ? 'bg-foreground text-background' : 'bg-content2 text-foreground-500 hover:bg-content3'
          }`}
          onPress={() => {
            setActiveTab('food');
            setSearchInput('');
          }}
          variant="ghost"
        >
          Foods
        </Button>
        <Button
          className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
            activeTab === 'recipe'
              ? 'bg-foreground text-background'
              : 'bg-content2 text-foreground-500 hover:bg-content3'
          }`}
          onPress={() => {
            setActiveTab('recipe');
            setSearchInput('');
          }}
          variant="ghost"
        >
          Recipes
        </Button>
      </div>

      <Autocomplete
        allowsEmptyCollection
        className="w-full"
        disabledKeys={activeTab === 'food' ? excludeFoodIds : excludeRecipeIds}
        onChange={handleChange}
        placeholder={activeTab === 'food' ? 'Search foods...' : 'Search recipes...'}
        selectionMode="single"
        value={null}
      >
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter
            inputValue={searchInput}
            onInputChange={setSearchInput}
          >
            <SearchField
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="sticky top-0 z-10"
              name="meal-item-search"
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={activeTab === 'food' ? 'Search foods...' : 'Search recipes...'} />
                <Spinner
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${isFetching ? '' : 'pointer-events-none opacity-0'}`}
                  size="sm"
                />
                <SearchField.ClearButton className={isFetching ? 'pointer-events-none opacity-0' : ''} />
              </SearchField.Group>
            </SearchField>

            {activeTab === 'food' ? (
              <ListBox
                className="max-h-[280px] overflow-y-auto"
                items={foods}
                renderEmptyState={() => (
                  <EmptyState>{shouldQuery ? 'No foods found' : 'Type to search foods'}</EmptyState>
                )}
              >
                {(food: Food) => {
                  const m = normalizeMacros(food.macros);
                  const cal = m.calories_per_100g;
                  const pro = m.protein_g;
                  return (
                    <ListBox.Item
                      id={food.id}
                      key={food.id}
                      textValue={food.name}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                        {food.image_url ? (
                          <img
                            alt={food.name}
                            className="size-7 rounded-md object-cover"
                            src={food.image_url}
                          />
                        ) : (
                          <Apple
                            className="text-foreground-400"
                            size={14}
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{food.name}</Label>
                          {cal != null && cal > 0 && (
                            <span className="shrink-0 text-xs text-foreground-400">{cal} Cal</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {food.category && <Description>{food.category}</Description>}
                          {pro != null && pro > 0 && (
                            <span className="shrink-0 text-xs text-foreground-400">{pro}g P</span>
                          )}
                        </div>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  );
                }}
              </ListBox>
            ) : (
              <ListBox
                className="max-h-[280px] overflow-y-auto"
                items={recipes}
                renderEmptyState={() => (
                  <EmptyState>{shouldQuery ? 'No recipes found' : 'Type to search recipes'}</EmptyState>
                )}
              >
                {(recipe: Recipe) => {
                  const m = normalizeMacros(recipe.macros);
                  const cal = m.calories_per_100g;
                  const pro = m.protein_g;
                  return (
                    <ListBox.Item
                      id={recipe.id}
                      key={recipe.id}
                      textValue={recipe.name}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                        {recipe.image_url ? (
                          <img
                            alt={recipe.name}
                            className="size-7 rounded-md object-cover"
                            src={recipe.image_url}
                          />
                        ) : (
                          <ChefHat
                            className="text-foreground-400"
                            size={14}
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{recipe.name}</Label>
                          {cal != null && cal > 0 && (
                            <span className="shrink-0 text-xs text-foreground-400">{cal} Cal</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {recipe.category && <Description>{recipe.category}</Description>}
                          {pro != null && pro > 0 && (
                            <span className="shrink-0 text-xs text-foreground-400">{pro}g P</span>
                          )}
                        </div>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  );
                }}
              </ListBox>
            )}
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </div>
  );
}
