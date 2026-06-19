import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {useCallback, useDeferredValue, useMemo, useState} from 'react';

import {type Exercise, useListExercisesQuery} from '@/api/exercises';

type ExercisePickerProps = {
  excludeIds?: string[];
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
};

/**
 * Inline exercise search + select using HeroUI Autocomplete with async server filtering.
 *
 * Container decision: INLINE — single text input that opens a popover with results.
 *
 * Lives in training-plans/components/ as a cross-feature picker exception
 * (imports Exercise type from exercises API).
 */
export default function ExercisePicker({
  excludeIds = [],
  onSelect,
  placeholder = 'Search exercises to add...',
}: ExercisePickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const shouldQuery = deferredSearch.length >= 1;

  const {data, isFetching} = useListExercisesQuery(shouldQuery ? {search: deferredSearch, limit: 10} : undefined, {
    skip: !shouldQuery,
  });

  const exercises = useMemo(() => data?.data ?? [], [data]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const exercise of exercises) {
      map.set(exercise.id, exercise);
    }
    return map;
  }, [exercises]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) {
        return;
      }
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) {
        return;
      }
      const exercise = exerciseMap.get(id);
      if (exercise) {
        onSelect(exercise);
        setSearchInput('');
      }
    },
    [onSelect, exerciseMap],
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
            name="exercise-search"
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search exercises..." />
              <Spinner
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isFetching ? '' : 'pointer-events-none opacity-0'}`}
                size="sm"
              />
              <SearchField.ClearButton className={isFetching ? 'pointer-events-none opacity-0' : ''} />
            </SearchField.Group>
          </SearchField>
          <ListBox
            className="max-h-[280px] overflow-y-auto"
            items={exercises}
            renderEmptyState={() => (
              <EmptyState>{shouldQuery ? 'No exercises found' : 'Type to search exercises'}</EmptyState>
            )}
          >
            {(exercise: Exercise) => {
              const muscleNames = exercise.muscles.map((m) => m.name).join(', ');
              return (
                <ListBox.Item
                  id={exercise.id}
                  key={exercise.id}
                  textValue={exercise.name}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-content2">
                    <Dumbbell
                      className="text-foreground-400"
                      size={14}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Label>{exercise.name}</Label>
                    {(exercise.mechanics || muscleNames) && (
                      <Description>{[exercise.mechanics, muscleNames].filter(Boolean).join(' \u00b7 ')}</Description>
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
