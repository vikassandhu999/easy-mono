import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {type TrainingPlan, useListTrainingPlansQuery} from '@/api/trainingPlans';

type TrainingPlanPickerProps = {
  /** Called when the user selects a training plan */
  onSelect: (plan: TrainingPlan) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** IDs of plans to exclude (shown as disabled) */
  excludeIds?: string[];
};

/**
 * Inline training plan search + select using HeroUI Autocomplete.
 *
 * Shows only templates (is_template: true) for assignment workflows.
 * Cross-feature picker exception — may be imported from client detail page.
 */
export default function TrainingPlanPicker({
  excludeIds = [],
  onSelect,
  placeholder = 'Search training plans...',
}: TrainingPlanPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const shouldQuery = debouncedSearch.length >= 1;

  const {data, isFetching} = useListTrainingPlansQuery(
    shouldQuery ? {search: debouncedSearch, is_template: true, limit: 10} : undefined,
    {skip: !shouldQuery},
  );

  const plans = useMemo(() => data?.data ?? [], [data]);

  const planMap = useMemo(() => {
    const map = new Map<string, TrainingPlan>();
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
      disabledKeys={excludeIds}
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
            name="training-plan-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search training plans..." />
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
              <EmptyState>{shouldQuery ? 'No training plans found' : 'Type to search plans'}</EmptyState>
            )}
          >
            {(plan: TrainingPlan) => {
              const workoutCount = plan.planned_workouts.length;
              return (
                <ListBox.Item
                  id={plan.id}
                  key={plan.id}
                  textValue={plan.name}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                    <Dumbbell
                      className="text-foreground-400"
                      size={14}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Label>{plan.name}</Label>
                    {workoutCount > 0 && (
                      <Description>
                        {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
                      </Description>
                    )}
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
