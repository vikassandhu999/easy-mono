import {DAY_NAMES, formatDuration, formatSessionDateLong, SESSION_STATE_CHIP} from '@easy/utils';
import {Alert, Button, Chip, Separator, Spinner} from '@heroui/react';
import {Activity, ArrowLeft, Clock, Dumbbell, MessageSquare, Plus, RefreshCw, SkipForward} from 'lucide-react';
import {useParams} from 'react-router-dom';

import type {PerformedSet, PlannedSnapshotElement, WorkoutSession} from '@/api/workoutSessions';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetWorkoutSessionQuery} from '@/api/workoutSessions';

// ── Helpers ──────────────────────────────────────────────────

function formatLoad(value: null | number, unit: null | string): string {
  if (value == null) return '';
  if (unit === 'bodyweight' || unit === 'none') return unit === 'bodyweight' ? 'BW' : '';
  return `${value} ${unit ?? ''}`.trim();
}

type ExerciseGroup = {
  elementId: null | string;
  exerciseId: string;
  exerciseName: string;
  isAdded: boolean;
  isReplacement: boolean;
  originalExerciseName: null | string;
  plannedSets: Array<{loadUnit: null | string; loadValue: null | string; targetReps: null | string}>;
  sets: PerformedSet[];
};

function buildExerciseGroups(session: WorkoutSession): ExerciseGroup[] {
  const snapshot = session.planned_snapshot;
  const sets = session.performed_sets;

  // Build element lookup from snapshot
  const elementMap = new Map<string, PlannedSnapshotElement>();
  if (snapshot) {
    for (const el of snapshot.elements) {
      elementMap.set(el.element_id, el);
    }
  }

  // Group performed sets by workout_element_id (or by exercise_id for freestyle)
  const groupMap = new Map<string, PerformedSet[]>();
  const groupOrder: string[] = [];

  for (const set of [...sets].sort((a, b) => a.position - b.position)) {
    const key = set.workout_element_id ?? `freestyle_${set.exercise_id}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(set);
    } else {
      groupMap.set(key, [set]);
      groupOrder.push(key);
    }
  }

  const groups: ExerciseGroup[] = [];

  // First: iterate snapshot elements in order to include skipped exercises
  if (snapshot) {
    const processedKeys = new Set<string>();

    for (const el of [...snapshot.elements].sort((a, b) => a.position - b.position)) {
      const key = el.element_id;
      const setsForElement = groupMap.get(key) ?? [];
      processedKeys.add(key);

      const firstSet = setsForElement[0];
      const isReplacement = firstSet ? firstSet.exercise_id !== el.exercise_id : false;

      groups.push({
        elementId: el.element_id,
        exerciseId: firstSet?.exercise_id ?? el.exercise_id,
        exerciseName: isReplacement ? (firstSet?.exercise?.name ?? 'Unknown exercise') : el.exercise_name,
        isAdded: false,
        isReplacement,
        originalExerciseName: isReplacement ? el.exercise_name : null,
        plannedSets: el.planned_sets.map((ps) => ({
          loadUnit: ps.load_unit,
          loadValue: ps.load_value,
          targetReps: ps.target_reps,
        })),
        sets: setsForElement,
      });
    }

    // Then: add freestyle (workout_element_id is null) groups
    for (const key of groupOrder) {
      if (!processedKeys.has(key) && key.startsWith('freestyle_')) {
        const setsForGroup = groupMap.get(key) ?? [];
        const firstSet = setsForGroup[0];
        groups.push({
          elementId: null,
          exerciseId: firstSet?.exercise_id ?? '',
          exerciseName: firstSet?.exercise?.name ?? 'Unknown exercise',
          isAdded: true,
          isReplacement: false,
          originalExerciseName: null,
          plannedSets: [],
          sets: setsForGroup,
        });
      }
    }
  } else {
    // Freestyle session — no snapshot, just group by exercise_id
    for (const key of groupOrder) {
      const setsForGroup = groupMap.get(key) ?? [];
      const firstSet = setsForGroup[0];
      groups.push({
        elementId: null,
        exerciseId: firstSet?.exercise_id ?? '',
        exerciseName: firstSet?.exercise?.name ?? 'Unknown exercise',
        isAdded: false,
        isReplacement: false,
        originalExerciseName: null,
        plannedSets: [],
        sets: setsForGroup,
      });
    }
  }

  return groups;
}

function getAdherenceSummary(
  session: WorkoutSession,
  groups: ExerciseGroup[],
): {added: number; completed: number; replaced: number; skipped: number; totalPlanned: number; totalSets: number} {
  const totalPlanned = session.planned_snapshot?.elements.length ?? 0;
  let completed = 0;
  let replaced = 0;
  let skipped = 0;
  let added = 0;
  let totalSets = 0;

  for (const group of groups) {
    totalSets += group.sets.length;
    if (group.isAdded) {
      added++;
    } else if (group.sets.length === 0) {
      skipped++;
    } else if (group.isReplacement) {
      replaced++;
      completed++;
    } else {
      completed++;
    }
  }

  return {added, completed, replaced, skipped, totalPlanned, totalSets};
}

// ── Exercise group component ─────────────────────────────────

function ExerciseGroupSection({group}: {group: ExerciseGroup}) {
  const isSkipped = group.sets.length === 0 && !group.isAdded;
  const hasPlan = group.plannedSets.length > 0;

  return (
    <div className="py-3">
      {/* Exercise header */}
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold">{group.exerciseName}</h4>
        {group.isReplacement ? (
          <Chip
            color="default"
            size="sm"
            variant="soft"
          >
            <RefreshCw size={10} />
            <span className="ml-1">Replaced {group.originalExerciseName}</span>
          </Chip>
        ) : null}
        {group.isAdded ? (
          <Chip
            color="success"
            size="sm"
            variant="soft"
          >
            <Plus size={10} />
            <span className="ml-1">Added</span>
          </Chip>
        ) : null}
        {isSkipped ? (
          <Chip
            color="default"
            size="sm"
            variant="soft"
          >
            <SkipForward size={10} />
            <span className="ml-1">Skipped</span>
          </Chip>
        ) : null}
      </div>

      {/* Set table */}
      {isSkipped ? (
        <p className="text-xs text-foreground-400">
          {group.plannedSets.length} set{group.plannedSets.length !== 1 ? 's' : ''} planned, none performed
        </p>
      ) : group.sets.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-divider">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-content2">
                <th className="px-3 py-1.5 text-left text-xs font-medium text-foreground-400">#</th>
                {hasPlan ? (
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-foreground-400">Plan</th>
                ) : null}
                <th className="px-3 py-1.5 text-left text-xs font-medium text-foreground-400">Done</th>
                <th className="px-3 py-1.5 text-left text-xs font-medium text-foreground-400">Load</th>
              </tr>
            </thead>
            <tbody>
              {group.sets.map((set, idx) => {
                const planned = hasPlan ? group.plannedSets[idx] : null;
                return (
                  <tr
                    className="border-b border-divider last:border-b-0"
                    key={set.id}
                  >
                    <td className="px-3 py-1.5 text-foreground-400">{idx + 1}</td>
                    {hasPlan ? <td className="px-3 py-1.5 text-foreground-500">{planned?.targetReps ?? '—'}</td> : null}
                    <td className="px-3 py-1.5">
                      {set.completed ? (
                        <span>{set.actual_reps ?? '—'}</span>
                      ) : (
                        <span className="text-foreground-400">skipped</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">{formatLoad(set.load_value, set.load_unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function SessionDetail() {
  const {clientId, sessionId} = useParams<{clientId: string; sessionId: string}>();
  const goBack = useGoBack(`/clients/${clientId}`);
  const {data, isError, isLoading} = useGetWorkoutSessionQuery(sessionId!);

  if (isLoading) {
    return (
      <PageLayout title="Workout Session">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Workout Session">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back to client
          </Button>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load session</Alert.Title>
            <Alert.Description>The workout session may not exist or you don&apos;t have access.</Alert.Description>
          </Alert.Content>
        </Alert>
      </PageLayout>
    );
  }

  const session = data.data;
  const snapshot = session.planned_snapshot;
  const title = snapshot ? snapshot.workout_name : 'Freestyle workout';
  const dayName = snapshot ? (DAY_NAMES[snapshot.day_number] ?? null) : null;
  const dateStr = formatSessionDateLong(session.started_at);
  const duration = formatDuration(session.started_at, session.ended_at);
  const groups = buildExerciseGroups(session);
  const adherence = getAdherenceSummary(session, groups);

  const stateChip = SESSION_STATE_CHIP[session.state];

  return (
    <PageLayout title="Workout Session">
      {/* Back button */}
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back to client
        </Button>
      </div>

      <div className="max-w-lg">
        {/* ── Header ────────────────────────────────────── */}
        <div className="pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {stateChip ? (
              <Chip
                color={stateChip.color}
                size="sm"
                variant="soft"
              >
                {stateChip.label}
              </Chip>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-foreground-500">
            {dayName ? `${dayName} \u00B7 ` : ''}
            {dateStr}
          </p>
        </div>

        {/* ── Stats row ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 pb-4">
          {duration ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Clock size={14} />
              {duration}
            </div>
          ) : null}
          {session.soreness_rating ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Activity size={14} />
              Effort: {session.soreness_rating}/5
            </div>
          ) : null}
          {snapshot ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Dumbbell size={14} />
              {adherence.completed}/{adherence.totalPlanned} exercises
              {adherence.totalSets > 0 ? ` \u00B7 ${adherence.totalSets} sets` : ''}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Dumbbell size={14} />
              {adherence.totalSets} sets across {groups.length} exercise{groups.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Notes */}
        {session.notes ? (
          <div className="flex items-start gap-2 pb-4">
            <MessageSquare
              className="mt-0.5 shrink-0 text-foreground-400"
              size={14}
            />
            <p className="text-sm italic text-foreground-500">&ldquo;{session.notes}&rdquo;</p>
          </div>
        ) : null}

        {/* ── Adherence badges ──────────────────────────── */}
        {snapshot ? (
          <div className="flex flex-wrap gap-2 pb-4">
            {adherence.replaced > 0 ? (
              <Chip
                color="default"
                size="sm"
                variant="soft"
              >
                {adherence.replaced} replaced
              </Chip>
            ) : null}
            {adherence.skipped > 0 ? (
              <Chip
                color="default"
                size="sm"
                variant="soft"
              >
                {adherence.skipped} skipped
              </Chip>
            ) : null}
            {adherence.added > 0 ? (
              <Chip
                color="success"
                size="sm"
                variant="soft"
              >
                {adherence.added} added
              </Chip>
            ) : null}
          </div>
        ) : null}

        <Separator />

        {/* ── Exercise groups ───────────────────────────── */}
        {groups.length > 0 ? (
          <div className="divide-y divide-divider">
            {groups.map((group) => (
              <ExerciseGroupSection
                group={group}
                key={group.elementId ?? `added_${group.exerciseId}`}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-foreground-400">No exercises logged in this session.</p>
        )}
      </div>
    </PageLayout>
  );
}
