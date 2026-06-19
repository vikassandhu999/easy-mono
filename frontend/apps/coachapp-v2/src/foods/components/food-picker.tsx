import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Apple} from 'lucide-react';
import {useCallback, useDeferredValue, useMemo, useState} from 'react';

import {type Food, useListFoodsQuery} from '@/api/foods';

type FoodPickerProps = {
  onSelect: (food: Food) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  excludeIds?: string[];
};

export default function FoodPicker({
  onSelect,
  label,
  description,
  placeholder = 'Search foods to add...',
  excludeIds = [],
}: FoodPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const shouldQuery = deferredSearch.length >= 1;

  const {data, isFetching} = useListFoodsQuery(
    {search: deferredSearch, limit: 10},
    {
      skip: !shouldQuery,
    },
  );

  const foods = useMemo(() => data?.data ?? [], [data]);

  // Build a lookup map so we can resolve the full Food object from a Key on selection
  const foodMap = useMemo(() => {
    const map = new Map<string, Food>();
    for (const food of foods) {
      map.set(food.id, food);
    }
    return map;
  }, [foods]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) {
        return;
      }
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) {
        return;
      }
      const food = foodMap.get(id);
      if (food) {
        onSelect(food);
        // Clear the search after selection
        setSearchInput('');
      }
    },
    [onSelect, foodMap],
  );

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-full"
      disabledKeys={excludeIds}
      onChange={handleChange}
      placeholder={placeholder}
      selectionMode="single"
      value={null}
    >
      {label && <Label>{label}</Label>}
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      {description && <Description>{description}</Description>}
      <Autocomplete.Popover>
        <Autocomplete.Filter
          inputValue={searchInput}
          onInputChange={setSearchInput}
        >
          <SearchField
            className="sticky top-0 z-10"
            name="food-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search foods..." />
              <Spinner
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isFetching ? '' : 'pointer-events-none opacity-0'}`}
                size="sm"
              />
              <SearchField.ClearButton className={isFetching ? 'pointer-events-none opacity-0' : ''} />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-70 overflow-y-auto"
            items={foods}
            renderEmptyState={() => <EmptyState>{shouldQuery ? 'No foods found' : 'Type to search foods'}</EmptyState>}
          >
            {(food: Food) => {
              const cal = food.macros.calories_per_100g;
              const pro = food.macros.protein_g;
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
                      {pro != null && pro > 0 && <span className="shrink-0 text-xs text-foreground-400">{pro}g P</span>}
                    </div>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              );
            }}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
