import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {ClipboardList} from 'lucide-react';
import {useDeferredValue, useState} from 'react';

import type {NutritionPlan} from '@/api/generated';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';

type NutritionPlanPickerProps = {
  autoFocus?: boolean;
  onSelect: (plan: NutritionPlan) => void;
  placeholder?: string;
};

// Backed by GET /v1/coach/nutrition-plans, which strictly returns templates only.
// Uses the hand-written infinite query (the generated list hook does not model
// the `search` param); we only consume the first page for the picker dropdown.
export default function NutritionPlanPicker({
  autoFocus = false,
  onSelect,
  placeholder = 'Search nutrition plans...',
}: NutritionPlanPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const skipQuery = deferredSearch.length < 1;

  const {data, isFetching} = useCoachNutritionPlansInfiniteQuery(
    {search: deferredSearch},
    {
      skip: skipQuery,
    },
  );

  const plans: NutritionPlan[] = data?.pages.flatMap((page) => page.data) ?? [];

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
            className="max-h-70 overflow-y-auto"
            items={plans}
            renderEmptyState={() => (
              <EmptyState>{skipQuery ? 'No plans found' : 'Type to search nutrition plans'}</EmptyState>
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
