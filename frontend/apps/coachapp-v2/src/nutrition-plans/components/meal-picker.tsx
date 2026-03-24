import type {Key} from '@heroui/react';

import {Autocomplete, EmptyState, Label, ListBox, SearchField} from '@heroui/react';
import {Plus, UtensilsCrossed} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {Meal} from '@/api/meals';

const CREATE_NEW_ID = '__create_new__';

type MealPickerProps = {
  /** The plan's existing meals to pick from */
  meals: Meal[];
  /** Called when the user selects an existing meal */
  onSelect: (meal: Meal) => void;
  /** Called when the user picks the "New meal" option. Receives the typed name (may be empty). */
  onCreate?: (name: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
};

/** Item shape for the combined list (create action + meals) */
type PickerItem = {id: string; kind: 'create'; name: string} | {id: string; kind: 'meal'; meal: Meal};

/**
 * Autocomplete picker for selecting from a plan's existing meals,
 * with a permanent "New meal" action as the first option.
 *
 * - No text typed → shows "New meal" + all meals
 * - Text typed → shows "Create [name]" + filtered meals
 *
 * Client-side filtering from the meals array prop.
 * After selection, the input clears and onSelect/onCreate fires.
 */
export default function MealPicker({meals, onSelect, onCreate, placeholder = 'Search meals...'}: MealPickerProps) {
  const [searchInput, setSearchInput] = useState('');

  const filteredMeals = useMemo(() => {
    if (!searchInput) return meals;
    const q = searchInput.toLowerCase();
    return meals.filter((m) => m.name.toLowerCase().includes(q));
  }, [meals, searchInput]);

  const mealMap = useMemo(() => {
    const map = new Map<string, Meal>();
    for (const meal of meals) {
      map.set(meal.id, meal);
    }
    return map;
  }, [meals]);

  // Build combined items list: create action first, then filtered meals
  const items = useMemo<PickerItem[]>(() => {
    const list: PickerItem[] = [];
    if (onCreate) {
      list.push({
        id: CREATE_NEW_ID,
        kind: 'create',
        name: searchInput.trim(),
      });
    }
    for (const meal of filteredMeals) {
      list.push({id: meal.id, kind: 'meal', meal});
    }
    return list;
  }, [onCreate, searchInput, filteredMeals]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) return;
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) return;

      if (id === CREATE_NEW_ID && onCreate) {
        onCreate(searchInput.trim());
        setSearchInput('');
        return;
      }

      const meal = mealMap.get(id);
      if (meal) {
        onSelect(meal);
        setSearchInput('');
      }
    },
    [onSelect, onCreate, mealMap, searchInput],
  );

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-full"
      onChange={handleChange}
      placeholder={placeholder}
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
            className="sticky top-0 z-10"
            name="meal-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={placeholder} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-[220px] overflow-y-auto"
            items={items}
            renderEmptyState={() => <EmptyState>No meals available</EmptyState>}
          >
            {(item: PickerItem) => {
              if (item.kind === 'create') {
                const label = item.name ? `Create "${item.name}"` : 'New meal';
                return (
                  <ListBox.Item
                    id={item.id}
                    textValue={label}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/10">
                      <Plus
                        className="text-accent"
                        size={14}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <Label className="text-accent">{label}</Label>
                    </div>
                  </ListBox.Item>
                );
              }
              return (
                <ListBox.Item
                  id={item.id}
                  textValue={item.meal.name}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                    <UtensilsCrossed
                      className="text-foreground-400"
                      size={14}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <Label>{item.meal.name}</Label>
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
