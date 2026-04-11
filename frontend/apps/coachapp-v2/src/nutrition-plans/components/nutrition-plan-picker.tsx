import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {ClipboardList} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type NutritionPlan, useListNutritionPlansQuery} from '@/api/nutritionPlans';

type NutritionPlanPickerProps = {
  /** Open the popover and focus the search field on mount. Used when the picker is rendered in response to an explicit user action. */
  autoFocus?: boolean;
  /** Optional description text */
  description?: string;
  /** IDs of plans to exclude (shown as disabled) */
  excludeIds?: string[];
  /** Optional label text */
  label?: string;
  /** Called when the user selects a nutrition plan template from the list */
  onSelect: (plan: NutritionPlan) => void;
  /** Optional placeholder text */
  placeholder?: string;
};

/**
 * Inline nutrition plan template search + select using HeroUI Autocomplete
 * with async server filtering.
 *
 * Container decision: INLINE — single text input that opens a popover with results.
 *
 * Backed by the library endpoint (`GET /v1/coach/nutrition_plans`), which
 * strictly returns templates only. Used by client detail page to pick a
 * template to assign to a client.
 */
export default function NutritionPlanPicker({
  autoFocus = false,
  description,
  excludeIds = [],
  label,
  onSelect,
  placeholder = 'Search nutrition plans...',
}: NutritionPlanPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const shouldQuery = debouncedSearch.length >= 1;

  const {data, isFetching} = useListNutritionPlansQuery(
    shouldQuery ? {search: debouncedSearch, limit: 10} : undefined,
    {skip: !shouldQuery},
  );

  const plans = useMemo(() => data?.data ?? [], [data]);

  const planMap = useMemo(() => {
    const map = new Map<string, NutritionPlan>();
    for (const plan of plans) {
      map.set(plan.id, plan);
    }
    return map;
  }, [plans]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) return;
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) return;
      const plan = planMap.get(id);
      if (plan) {
        onSelect(plan);
        setSearchInput('');
      }
    },
    [onSelect, planMap],
  );

  return (
    <Autocomplete
      allowsEmptyCollection
      className="w-full"
      defaultOpen={autoFocus}
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
            // eslint-disable-next-line jsx-a11y/no-autofocus
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
