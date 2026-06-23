import type {Key} from '@heroui/react';
import {Autocomplete, Button, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import type {LucideIcon} from 'lucide-react';
import {Apple, ChefHat} from 'lucide-react';
import {useDeferredValue, useState} from 'react';

import {type Food, useListFoodsQuery} from '@/api/foods';
import {type Recipe, useListRecipesQuery} from '@/api/recipes';

type PickerTab = 'food' | 'recipe';

function renderItem(item: Food | Recipe, Icon: LucideIcon) {
  const cal = item.macros.calories_per_100g;
  const pro = item.macros.protein_g;
  return (
    <ListBox.Item
      id={item.id}
      key={item.id}
      textValue={item.name}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
        {item.image_url ? (
          <img
            alt={item.name}
            className="size-7 rounded-md object-cover"
            src={item.image_url}
          />
        ) : (
          <Icon
            className="text-foreground-400"
            size={14}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <Label>{item.name}</Label>
          {cal != null && cal > 0 && <span className="shrink-0 text-xs text-foreground-400">{cal} Cal</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          {item.category && <Description>{item.category}</Description>}
          {pro != null && pro > 0 && <span className="shrink-0 text-xs text-foreground-400">{pro}g P</span>}
        </div>
      </div>
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

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
  const deferredSearch = useDeferredValue(searchInput);
  const skipQuery = deferredSearch.length >= 1;

  const {data: foodData, isFetching: isFetchingFoods} = useListFoodsQuery(
    {search: deferredSearch, limit: 10},
    {skip: skipQuery || activeTab !== 'food'},
  );
  const foods = foodData?.data ?? [];

  const {data: recipeData, isFetching: isFetchingRecipes} = useListRecipesQuery(
    {search: deferredSearch, limit: 10},
    {skip: skipQuery || activeTab !== 'recipe'},
  );
  const recipes = recipeData?.data ?? [];

  const isFetching = activeTab === 'food' ? isFetchingFoods : isFetchingRecipes;

  const handleChange = (key: Key | Key[] | null) => {
    if (key == null) {
      return;
    }
    const id = String(Array.isArray(key) ? (key[0] ?? '') : key);
    if (!id) {
      return;
    }

    if (activeTab === 'food') {
      const food = foods.find((item) => item.id === id);
      if (food) {
        onSelectFood(food);
        setSearchInput('');
      }
      return;
    }

    const recipe = recipes.find((item) => item.id === id);
    if (recipe) {
      onSelectRecipe(recipe);
      setSearchInput('');
    }
  };

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
                className="max-h-70 overflow-y-auto"
                items={foods}
                renderEmptyState={() => (
                  <EmptyState>{skipQuery ? 'No foods found' : 'Type to search foods'}</EmptyState>
                )}
              >
                {(food: Food) => renderItem(food, Apple)}
              </ListBox>
            ) : (
              <ListBox
                className="max-h-70 overflow-y-auto"
                items={recipes}
                renderEmptyState={() => (
                  <EmptyState>{skipQuery ? 'No recipes found' : 'Type to search recipes'}</EmptyState>
                )}
              >
                {(recipe: Recipe) => renderItem(recipe, ChefHat)}
              </ListBox>
            )}
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </div>
  );
}
