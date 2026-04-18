import {getWorkoutTitle} from '@easy/utils';
import {Alert, Button, Spinner} from '@heroui/react';
import {ArrowLeft, Clock, Plus} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';

import type {WorkoutExercise} from '@/workout/components/workout-types';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetActiveWorkoutSessionQuery} from '@/api/workoutSessions';
import ExercisePicker from '@/workout/components/exercise-picker';
import ExerciseRow from '@/workout/components/exercise-row';
import FinishWorkout from '@/workout/components/finish-workout';
import SetLogger from '@/workout/components/set-logger';
import {useWorkoutLocalState} from '@/workout/components/use-workout-local-state';
import {buildWorkoutExercises} from '@/workout/components/workout-types';

// ── Timer hook ───────────────────────────────────────────────

function useElapsedTimer(startedAt: null | string): string {
  const [now, setNow] = useState(() => Date.now());
  const startMs = useMemo(() => (startedAt ? new Date(startedAt).getTime() : null), [startedAt]);

  useEffect(() => {
    if (!startMs) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startMs]);

  if (!startMs) return '0:00';
  const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
}

// ── Main component ───────────────────────────────────────────

export default function ActiveWorkout() {
  const goBack = useGoBack(ROUTES.TRAINING);
  const {data, isError, isLoading} = useGetActiveWorkoutSessionQuery(undefined, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: true,
  });

  const session = data?.data;

  // Client-side state for skips, replacements, and added exercises — persisted to sessionStorage
  const {addedExercises, replacements, setAddedExercises, setReplacements, setSkippedElementIds, skippedElementIds} =
    useWorkoutLocalState(session?.id ?? null);
  const [expandedIndex, setExpandedIndex] = useState<null | number>(null);
  const [userHasToggled, setUserHasToggled] = useState(false);
  const snapshot = session?.planned_snapshot;
  const elapsed = useElapsedTimer(session?.started_at ?? null);

  // Build exercise list from snapshot + performed sets + client-side state
  const exercises: WorkoutExercise[] = useMemo(() => {
    if (!session) return [];
    return buildWorkoutExercises(
      snapshot?.elements ?? [],
      session.performed_sets,
      skippedElementIds,
      addedExercises,
      replacements,
    );
  }, [session, snapshot?.elements, skippedElementIds, addedExercises, replacements]);

  // Derive initial expanded index: first non-done exercise, until user manually toggles
  const activeExpandedIndex = useMemo(() => {
    if (userHasToggled) return expandedIndex;
    if (exercises.length === 0) return null;
    const firstActive = exercises.findIndex((ex) => ex.status === 'not_started' || ex.status === 'in_progress');
    return firstActive >= 0 ? firstActive : null;
  }, [exercises, expandedIndex, userHasToggled]);

  const handleToggle = useCallback((index: number) => {
    setUserHasToggled(true);
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleSkip = useCallback(
    (elementId: null | string) => {
      if (!elementId) return;
      setSkippedElementIds((prev) => {
        const next = new Set(prev);
        if (next.has(elementId)) {
          next.delete(elementId);
        } else {
          next.add(elementId);
        }
        return next;
      });
    },
    [setSkippedElementIds],
  );

  const handleReplace = useCallback(
    (elementId: null | string, selected: {id: string; name: string}) => {
      if (!elementId) return;
      setReplacements((prev) => {
        const next = new Map(prev);
        next.set(elementId, {exerciseId: selected.id, exerciseName: selected.name});
        return next;
      });
    },
    [setReplacements],
  );

  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showFinish, setShowFinish] = useState(false);

  const handleAddExercise = useCallback(
    (selected: {id: string; name: string}) => {
      setAddedExercises((prev) => [...prev, {exerciseId: selected.id, exerciseName: selected.name}]);
      setShowAddPicker(false);
    },
    [setAddedExercises],
  );

  // Loading
  if (isLoading) {
    return (
      <PageLayout title="Workout">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  // No active session
  if (isError || !session) {
    return (
      <PageLayout title="Workout">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No active workout</Alert.Title>
            <Alert.Description>Start a workout from Training to begin logging.</Alert.Description>
          </Alert.Content>
        </Alert>
      </PageLayout>
    );
  }

  const workoutTitle = getWorkoutTitle(snapshot ?? null);

  return (
    <PageLayout title={workoutTitle}>
      {/* Timer bar */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground-500">
          <Clock size={14} />
          {elapsed}
        </div>
        <div className="flex-1" />
      </div>

      {/* Exercise list */}
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
        {exercises.length > 0 ? (
          exercises.map((exercise, index) => (
            <ExerciseRow
              exercise={exercise}
              isExpanded={activeExpandedIndex === index}
              key={exercise.workoutElementId ?? `added_${exercise.exerciseId}_${index}`}
              onReplace={(selected) => handleReplace(exercise.workoutElementId, selected)}
              onSkip={() => handleSkip(exercise.workoutElementId)}
              onToggle={() => handleToggle(index)}
            >
              {activeExpandedIndex === index ? (
                <SetLogger
                  exercise={exercise}
                  sessionId={session.id}
                  totalSetsInSession={session.performed_sets.length}
                />
              ) : null}
            </ExerciseRow>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-foreground-400">
              {snapshot ? 'Great work — all exercises are logged.' : 'No exercises yet. Add one to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Add exercise */}
      <div className="mt-3">
        {showAddPicker ? (
          <div className="rounded-xl border border-divider bg-content1 p-4">
            <p className="mb-2 text-sm font-semibold">Add exercise</p>
            <ExercisePicker
              onSelect={handleAddExercise}
              placeholder="Search exercises to add..."
            />
            <Button
              className="mt-2"
              onPress={() => setShowAddPicker(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onPress={() => setShowAddPicker(true)}
            variant="secondary"
          >
            <Plus size={16} />
            Add exercise
          </Button>
        )}
      </div>

      {/* Finish workout */}
      <div className="mt-4">
        {showFinish ? (
          <FinishWorkout
            exercises={exercises}
            onCancel={() => setShowFinish(false)}
            sessionId={session.id}
            startedAt={session.started_at}
            workoutTitle={workoutTitle}
          />
        ) : (
          <Button
            className="w-full"
            onPress={() => setShowFinish(true)}
            variant="primary"
          >
            Finish workout
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
