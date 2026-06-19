import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {ClipboardList} from 'lucide-react';
import {useDeferredValue, useState} from 'react';

import {type NutritionPlan, useListNutritionPlansQuery} from '@/api/nutritionPlans';

type NutritionPlanPickerProps = {
  autoFocus?: boolean;
  onSelect: (plan: NutritionPlan) => void;
  placeholder?: string;
};

// Backed by GET /v1/coach/nutrition_plans, which strictly returns templates only.
export default function NutritionPlanPicker({
  autoFocus = false,
  onSelect,
  placeholder = 'Search nutrition plans...',
}: NutritionPlanPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const shouldQuery = deferredSearch.length >= 1;

  const {data, isFetching} = useListNutritionPlansQuery(
    shouldQuery ? {search: deferredSearch, limit: 10} : undefined,
    {skip: !shouldQuery},
  );

  const plans = data?.data ?? [];

  const handleChange = (key: Key | Key[] | null) => {
    if (key == null) {
      return;
    }
    const id = String(Array.isArray(key) ? (key[0] ?? '') : key);
    if (!id) {
      return;
    }
    const plan = plans.find((item) => item.id === id);
    if (plan) {
      onSelect(plan);
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
            autoFocus={autoFocus}
            className="sticky top-0 z-10"
            name="nutrition-plan-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search plans..." />
              <Spinner
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isFetching ? '' : 'pointer-events-none opacity-0'}`}
                size="sm"
              />
              <SearchField.ClearButton className={isFetching ? 'pointer-events-none opacity-0' : ''} />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-[280px] overflow-y-auto"
            items={plans}
            renderEmptyState={() => (
              <EmptyState>{shouldQuery ? 'No plans found' : 'Type to search nutrition plans'}</EmptyState>
            )}
          >
            {(plan: NutritionPlan) => (
              <ListBox.Item
                id={plan.id}
                key={plan.id}
                textValue={plan.name}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                  <ClipboardList
                    className="text-foreground-400"
                    size={14}
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <Label>{plan.name}</Label>
                  {plan.description && <Description>{plan.description}</Description>}
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
