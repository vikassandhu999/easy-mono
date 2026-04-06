import type {Key} from '@heroui/react';

import {Autocomplete, Description, EmptyState, Label, ListBox, SearchField, Spinner} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';

import type {ClientExercise} from '@/api/exercises';

import {useDebouncedValue} from '@/@hooks/use-debounced-value';
import {useListClientExercisesQuery} from '@/api/exercises';

type ExercisePickerProps = {
  /** Comma-separated muscle IDs to pre-filter suggestions (e.g. for exercise replacement) */
  defaultMuscleIds?: string;
  /** Called when the user selects an exercise */
  onSelect: (exercise: {id: string; name: string}) => void;
  /** Optional placeholder text */
  placeholder?: string;
};

export default function ExercisePicker({
  defaultMuscleIds,
  onSelect,
  placeholder = 'Search exercises...',
}: ExercisePickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const hasSearch = debouncedSearch.length >= 1;
  // Show suggestions when we have muscle IDs even without search text
  const shouldQuery = hasSearch || !!defaultMuscleIds;

  const {data, isFetching} = useListClientExercisesQuery(
    shouldQuery
      ? {
          ...(hasSearch && {search: debouncedSearch}),
          ...(defaultMuscleIds && !hasSearch && {muscle_ids: defaultMuscleIds}),
          limit: 10,
        }
      : undefined,
    {skip: !shouldQuery},
  );

  const exercises = useMemo(() => data?.data ?? [], [data]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, ClientExercise>();
    for (const exercise of exercises) {
      map.set(exercise.id, exercise);
    }
    return map;
  }, [exercises]);

  const handleChange = useCallback(
    (key: Key | Key[] | null) => {
      if (key == null) return;
      const id = typeof key === 'string' ? key : Array.isArray(key) ? String(key[0]) : String(key);
      if (!id) return;
      const exercise = exerciseMap.get(id);
      if (exercise) {
        onSelect({id: exercise.id, name: exercise.name});
        setSearchInput('');
      }
    },
    [onSelect, exerciseMap],
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
              <EmptyState>
                {hasSearch ? 'No exercises found' : defaultMuscleIds ? 'No similar exercises found' : 'Type to search'}
              </EmptyState>
            )}
          >
            {(exercise: ClientExercise) => {
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
                    {muscleNames || exercise.mechanics ? (
                      <Description>{[exercise.mechanics, muscleNames].filter(Boolean).join(' \u00B7 ')}</Description>
                    ) : null}
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
