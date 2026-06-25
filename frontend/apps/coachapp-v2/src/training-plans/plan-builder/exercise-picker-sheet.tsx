/**
 * ExercisePickerSheet — composes SearchPickerSheet to let a coach search the
 * training-exercise library, filter by muscle / equipment, multi-select, and
 * add custom exercises when no match exists.
 *
 * Props:
 *   open     — controls visibility
 *   onClose  — close handler
 *   onAdd    — called with the array of selected TrainingExercise objects
 *
 * Internal state:
 *   - search string (debounced → infinite query arg)
 *   - active muscle ids Set
 *   - active equipment ids Set
 *   - selected exercise ids Set (multi-select)
 */
import {Chip} from '@heroui/react';
import {useCallback, useMemo, useState} from 'react';

import type {TrainingExercise} from '@/api/generated';
import {useListEquipmentQuery, useListMusclesQuery} from '@/api/generated';
import {useCoachTrainingExercisesInfiniteQuery, useCreateCoachTrainingExerciseMutation} from '@/api/training-exercises';
import type {FilterChip} from '@/builder-kit/search-picker-sheet';
import {SearchPickerSheet} from '@/builder-kit/search-picker-sheet';
import {useDebounce} from '@/hooks/use-debounce';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (exercises: TrainingExercise[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map tracking_type value to a short human label for the badge. */
function trackingTypeBadgeLabel(trackingType: string | null): string {
  switch (trackingType) {
    case 'weight_reps':
      return 'wt+reps';
    case 'reps_only':
      return 'reps';
    case 'duration':
      return 'time';
    case 'distance_duration':
      return 'dist+time';
    case 'bodyweight_reps':
      return 'bw+reps';
    case 'weighted_bodyweight':
      return 'wt+bw';
    case 'assisted_bodyweight':
      return 'asst+bw';
    case 'weight_duration':
      return 'wt+time';
    case 'weight_distance':
      return 'wt+dist';
    default:
      return trackingType ?? '—';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExercisePickerSheet({open, onClose, onAdd}: ExercisePickerSheetProps) {
  // --- Search ---
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // --- Filters ---
  const [activeMuscleIds, setActiveMuscleIds] = useState<Set<string>>(new Set());
  const [activeEquipmentIds, setActiveEquipmentIds] = useState<Set<string>>(new Set());

  // --- Selection ---
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Keep a map of id → exercise object so we can pass full objects to onAdd.
  const [selectedExercises, setSelectedExercises] = useState<Map<string, TrainingExercise>>(new Map());

  // --- Data: muscles + equipment chips ---
  const {data: musclesData} = useListMusclesQuery({});
  const {data: equipmentData} = useListEquipmentQuery({});

  // --- Data: infinite exercise search ---
  const {
    data: exercisePages,
    isFetching,
    hasNextPage,
    fetchNextPage,
  } = useCoachTrainingExercisesInfiniteQuery({
    search: debouncedSearch || undefined,
    muscleIds: activeMuscleIds.size > 0 ? Array.from(activeMuscleIds) : undefined,
    equipmentIds: activeEquipmentIds.size > 0 ? Array.from(activeEquipmentIds) : undefined,
  });

  // --- Data: create mutation ---
  const [createExercise] = useCreateCoachTrainingExerciseMutation();

  // --- Derived: flat exercise list ---
  const exercises = useMemo(() => exercisePages?.pages.flatMap((page) => page.data) ?? [], [exercisePages]);

  // --- Filter chips ---
  const muscleChips: FilterChip[] = useMemo(
    () =>
      (musclesData?.data ?? []).map((m) => ({
        id: m.id,
        label: m.name,
        active: activeMuscleIds.has(m.id),
        onToggle: () => {
          setActiveMuscleIds((prev) => {
            const next = new Set(prev);
            if (next.has(m.id)) {
              next.delete(m.id);
            } else {
              next.add(m.id);
            }
            return next;
          });
        },
      })),
    [musclesData, activeMuscleIds],
  );

  const equipmentChips: FilterChip[] = useMemo(
    () =>
      (equipmentData?.data ?? []).map((e) => ({
        id: e.id,
        label: e.name,
        active: activeEquipmentIds.has(e.id),
        onToggle: () => {
          setActiveEquipmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(e.id)) {
              next.delete(e.id);
            } else {
              next.add(e.id);
            }
            return next;
          });
        },
      })),
    [equipmentData, activeEquipmentIds],
  );

  // Equipment first (a short, finite set) so it's reachable before the long
  // muscle list — otherwise it's buried past ~20 muscle chips in the scroll row.
  const filters: FilterChip[] = [...equipmentChips, ...muscleChips];

  // --- Handlers ---
  const handleToggleItem = useCallback((exercise: TrainingExercise) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.add(exercise.id);
      }
      return next;
    });
    setSelectedExercises((prev) => {
      const next = new Map(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.set(exercise.id, exercise);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const chosen = Array.from(selectedExercises.values());
    onAdd(chosen);
    // Reset state
    setSelectedKeys(new Set());
    setSelectedExercises(new Map());
    setSearch('');
    setActiveMuscleIds(new Set());
    setActiveEquipmentIds(new Set());
    onClose();
  }, [selectedExercises, onAdd, onClose]);

  const handleCreateNoMatch = useCallback(
    async (query: string) => {
      try {
        const result = await createExercise({
          trainingExerciseCreateRequest: {name: query},
        }).unwrap();
        const newExercise = result.data;
        // Auto-select the newly created exercise
        setSelectedKeys((prev) => new Set([...prev, newExercise.id]));
        setSelectedExercises((prev) => new Map([...prev, [newExercise.id, newExercise]]));
        // Clear search + filters so the just-created exercise is visible in the list.
        setSearch('');
        setActiveMuscleIds(new Set());
        setActiveEquipmentIds(new Set());
      } catch {
        // Creation failed — leave search text so the user can retry
      }
    },
    [createExercise],
  );

  const handleClose = useCallback(() => {
    // Reset on close so the sheet is clean next time it opens
    setSelectedKeys(new Set());
    setSelectedExercises(new Map());
    setSearch('');
    setActiveMuscleIds(new Set());
    setActiveEquipmentIds(new Set());
    onClose();
  }, [onClose]);

  // --- renderItem ---
  const renderItem = useCallback((exercise: TrainingExercise, selected: boolean) => {
    const primaryMuscle = exercise.muscles[0]?.name;
    const primaryEquipment = exercise.equipment[0]?.name;
    const meta = [primaryMuscle, primaryEquipment].filter(Boolean).join(' · ');

    return (
      <div className="flex items-center gap-2.5 px-1 py-2.5">
        {/* Checkbox visual */}
        <div
          className={[
            'h-5 w-5 shrink-0 rounded-md border-[1.5px] flex items-center justify-center',
            selected ? 'border-accent bg-accent text-accent-foreground' : 'border-default-hover',
          ].join(' ')}
          aria-hidden="true"
        >
          {selected ? <span className="text-[11px] font-bold leading-none">✓</span> : null}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{exercise.name}</div>
          {meta ? <div className="truncate text-xs text-muted">{meta}</div> : null}
        </div>

        {/* tracking_type badge */}
        {exercise.tracking_type ? (
          <Chip
            className="shrink-0"
            color="accent"
            size="sm"
            variant="secondary"
          >
            {trackingTypeBadgeLabel(exercise.tracking_type)}
          </Chip>
        ) : null}
      </div>
    );
  }, []);

  return (
    <SearchPickerSheet<TrainingExercise>
      confirmLabel={(n) => (n === 0 ? 'Add exercises' : `Add ${n} exercise${n === 1 ? '' : 's'}`)}
      filters={filters}
      hasMore={hasNextPage ?? false}
      itemKey={(ex) => ex.id}
      items={exercises}
      loading={isFetching || search !== debouncedSearch}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onCreateNoMatch={handleCreateNoMatch}
      onLoadMore={fetchNextPage}
      onSearchChange={setSearch}
      onToggleItem={handleToggleItem}
      open={open}
      renderItem={renderItem}
      search={search}
      selectedKeys={selectedKeys}
      title="Add exercises"
    />
  );
}
