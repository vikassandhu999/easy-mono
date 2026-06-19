import type {Key} from '@heroui/react';

import {Autocomplete, EmptyState, Label, ListBox, SearchField} from '@heroui/react';
import {Plus, UtensilsCrossed} from 'lucide-react';
import {useState} from 'react';

import type {Meal} from '@/api/meals';

const CREATE_NEW_ID = '__create_new__';

type MealPickerProps = {
  autoFocus?: boolean;
  meals: Meal[];
  onCreate?: (name: string) => void;
  onSelect: (meal: Meal) => void;
  placeholder?: string;
};

type PickerItem = {id: string; kind: 'create'; name: string} | {id: string; kind: 'meal'; meal: Meal};

export default function MealPicker({
  autoFocus = false,
  meals,
  onCreate,
  onSelect,
  placeholder = 'Search meals...',
}: MealPickerProps) {
  const [searchInput, setSearchInput] = useState('');

  const q = searchInput.toLowerCase();
  const filteredMeals = searchInput ? meals.filter((meal) => meal.name.toLowerCase().includes(q)) : meals;
  const items: PickerItem[] = [
    ...(onCreate ? [{id: CREATE_NEW_ID, kind: 'create' as const, name: searchInput.trim()}] : []),
    ...filteredMeals.map((meal) => ({id: meal.id, kind: 'meal' as const, meal})),
  ];

  const handleChange = (key: Key | Key[] | null) => {
    if (key == null) {
      return;
    }
    const id = String(Array.isArray(key) ? (key[0] ?? '') : key);
    if (!id) {
      return;
    }

    if (id === CREATE_NEW_ID && onCreate) {
      onCreate(searchInput.trim());
      setSearchInput('');
      return;
    }

    const meal = meals.find((item) => item.id === id);
    if (meal) {
      onSelect(meal);
      setSearchInput('');
    }
  };

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-full"
      defaultOpen={autoFocus}
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
