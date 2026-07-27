/**
 * Search the exercise library, filter by equipment/muscle, multi-select, and
 * create one on the spot when nothing matches. All the sheet mechanics come
 * from `SearchPickerSheet`; this only supplies data and selection.
 */
import {Chip} from '@heroui/react';
import {Check} from 'lucide-react';
import {useCallback, useMemo, useRef, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingExercise} from '@/api/training-exercises';
import {
  useCoachTrainingExercisesInfiniteQuery,
  useCreateCoachTrainingExerciseMutation,
  useListEquipmentQuery,
  useListMusclesQuery,
} from '@/api/training-exercises';
import type {FilterChip} from '@/builder-kit/search-picker-sheet';
import {SearchPickerSheet} from '@/builder-kit/search-picker-sheet';
import {useDebounce} from '@/hooks/use-debounce';

import {trackingTypeBadge} from '../tracking';

/** A set of ids with a toggle — the shape both filter rows need. */
function useIdSet() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  return {ids, toggle, clear};
}

function toChips(items: {id: string; name: string}[], active: Set<string>, toggle: (id: string) => void): FilterChip[] {
  return items.map((item) => ({
    id: item.id,
    label: item.name,
    active: active.has(item.id),
    onToggle: () => toggle(item.id),
  }));
}

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (exercises: TrainingExercise[]) => void;
  /** Desktop popover anchor — the `+ Add exercise` button. */
  anchorEl?: HTMLElement | null;
}

export function ExercisePicker({isOpen, onClose, onAdd, anchorEl}: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const muscles = useIdSet();
  const equipment = useIdSet();

  // One map, not a parallel Set and Map: the keys ARE the selection.
  const [selected, setSelected] = useState<Map<string, TrainingExercise>>(new Map());
  const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

  const {data: musclesData} = useListMusclesQuery({});
  const {data: equipmentData} = useListEquipmentQuery({});
  const {
    data: pages,
    isFetching,
    hasNextPage,
    fetchNextPage,
  } = useCoachTrainingExercisesInfiniteQuery({
    search: debouncedSearch || undefined,
    muscleIds: muscles.ids.size > 0 ? [...muscles.ids] : undefined,
    equipmentIds: equipment.ids.size > 0 ? [...equipment.ids] : undefined,
  });
  const createExerciseMutation = useCreateCoachTrainingExerciseMutation();

  const exercises = useMemo(() => pages?.pages.flatMap((page) => page.data) ?? [], [pages]);

  // Equipment first — a short, finite set, so it stays reachable instead of
  // being buried past ~20 muscle chips in the scroll row.
  const filters: FilterChip[] = [
    ...toChips(equipmentData?.data ?? [], equipment.ids, equipment.toggle),
    ...toChips(musclesData?.data ?? [], muscles.ids, muscles.toggle),
  ];

  const reset = useCallback(() => {
    setSelected(new Map());
    setSearch('');
    muscles.clear();
    equipment.clear();
  }, [equipment, muscles]);

  const toggleExercise = useCallback((exercise: TrainingExercise) => {
    setSelected((previous) => {
      const next = new Map(previous);
      if (!next.delete(exercise.id)) {
        next.set(exercise.id, exercise);
      }
      return next;
    });
  }, []);

  // A double-tap on the create row must not POST twice.
  const isCreating = useRef(false);

  const createFromSearch = useCallback(
    async (query: string) => {
      if (isCreating.current) {
        return;
      }
      isCreating.current = true;
      try {
        const {data: exercise} = await createExerciseMutation.mutateAsync({name: query});
        setSelected((previous) => new Map(previous).set(exercise.id, exercise));
        // Clear the query and filters so the new exercise is visible in the list.
        setSearch('');
        muscles.clear();
        equipment.clear();
      } catch (error) {
        // Leave the search text so the coach can retry.
        toastMutationError(error, "Couldn't create exercise");
      } finally {
        isCreating.current = false;
      }
    },
    [createExerciseMutation, equipment, muscles],
  );

  return (
    <SearchPickerSheet<TrainingExercise>
      anchorEl={anchorEl}
      confirmLabel={(count) => (count === 0 ? 'Add exercises' : `Add ${count} exercise${count === 1 ? '' : 's'}`)}
      filters={filters}
      hasMore={hasNextPage ?? false}
      itemKey={(exercise) => exercise.id}
      items={exercises}
      loading={isFetching || search !== debouncedSearch}
      onClose={() => {
        reset();
        onClose();
      }}
      onConfirm={() => {
        onAdd([...selected.values()]);
        reset();
        onClose();
      }}
      onCreateNoMatch={(query) => {
        createFromSearch(query).catch(() => undefined);
      }}
      onLoadMore={fetchNextPage}
      onSearchChange={setSearch}
      onToggleItem={toggleExercise}
      open={isOpen}
      placement="bottom"
      renderItem={renderExercise}
      search={search}
      selectedKeys={selectedKeys}
      title="Add exercises"
    />
  );
}

function renderExercise(exercise: TrainingExercise, isSelected: boolean) {
  const meta = [exercise.muscles[0]?.name, exercise.equipment[0]?.name].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-2">
      {/* Decorative: the row Button owns the press and announces state via aria-pressed. */}
      <div
        aria-hidden="true"
        className={[
          'flex size-5 shrink-0 items-center justify-center rounded-chip border',
          isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border',
        ].join(' ')}
      >
        {isSelected ? <Check className="size-3.5" /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate type-body font-medium text-foreground">{exercise.name}</div>
        {meta ? <div className="truncate type-eyebrow text-muted">{meta}</div> : null}
      </div>

      {exercise.tracking_type ? (
        <Chip
          className="shrink-0"
          color="accent"
          size="sm"
          variant="secondary"
        >
          {trackingTypeBadge(exercise.tracking_type)}
        </Chip>
      ) : null}
    </div>
  );
}
