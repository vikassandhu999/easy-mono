/**
 * Active workout — in-gym logging (spec: assets/client-training/02-active-structure,
 * 03-set-logging, 06-finish-discard). Continuous list: current exercise glows, current
 * set is a big block with ± steppers + one ✓ Log set, pre-filled from the plan. Done sets
 * collapse to green rows above. Full-screen (no tab bar). New schema: planned_snapshot +
 * performed_sets; log = create performed set; finish/discard = update session state.
 *
 * Deferred to a follow-up: rest timer, tap-to-type keypad, swap/skip/add actions (05),
 * non weight/reps measurables (04).
 */
import {AlertDialog, Button, Spinner, toast, useOverlayState} from '@heroui/react';
import {Check, Minus, Plus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  type TrainingPerformedSet,
  type TrainingSession,
  useCreateClientPerformedSetMutation,
  useGetClientTrainingSessionQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientTrainingSessionMutation,
} from '@/api/training';

type SnapshotSet = {
  load_unit?: null | string;
  load_value?: null | string;
  reps?: null | string;
  set_type?: null | string;
};
type SnapshotExercise = {
  exercise_id?: null | string;
  name?: null | string;
  position?: number;
  sets?: SnapshotSet[];
  tracking_type?: null | string;
};

const REPS_ONLY = new Set(['reps_only', 'bodyweight_reps']);

function unitLabel(unit?: null | string): string {
  return unit === 'lbs' ? 'lb' : unit === 'kg' ? 'kg' : '';
}

function formatSet(
  load: null | number | string | undefined,
  unit: null | string | undefined,
  reps: null | string | undefined,
  repsOnly: boolean,
): string {
  if (repsOnly) {
    return `${reps ?? '—'} reps`;
  }
  return `${load ?? '—'}${unitLabel(unit)} × ${reps ?? '—'}`;
}

// Assign performed sets to exercise occurrences. A performed set carries only
// exercise_id (no per-occurrence key), so a workout with the same exercise twice
// can't tell its occurrences apart by id alone. Consume them greedily in logged
// (position) order: each occurrence claims up to its planned set count.
// ponytail: relies on sets being logged in occurrence order — the linear UI
// (current = first incomplete exercise) guarantees it. Add a workout_element_id
// to the performed set if free-order logging is ever added.
function assignPerformed(exercises: SnapshotExercise[], performed: TrainingPerformedSet[]): TrainingPerformedSet[][] {
  const queues = new Map<string, TrainingPerformedSet[]>();
  for (const p of [...performed].sort((a, b) => a.position - b.position)) {
    const key = p.exercise_id ?? '';
    const q = queues.get(key) ?? [];
    q.push(p);
    queues.set(key, q);
  }
  return exercises.map((ex) => {
    const q = queues.get(ex.exercise_id ?? '');
    return q ? q.splice(0, (ex.sets ?? []).length) : [];
  });
}

function ElapsedClock({startedAt}: {startedAt: string}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="shrink-0 text-xs font-semibold text-accent">⏱ {h > 0 ? `${h}:${pad(m)}` : `${m}:${pad(s)}`}</span>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  onChange: (v: number) => void;
  step: number;
  value: number;
}) {
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="flex flex-1 items-center overflow-hidden rounded-[10px] border border-[#34343d]">
      <button
        aria-label={`Decrease ${label}`}
        className="grid place-items-center bg-[#1a1d2a] px-3.5 py-3 text-accent-soft-foreground active:opacity-70"
        onClick={() => onChange(Math.max(0, round(value - step)))}
        type="button"
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 py-1.5 text-center">
        <div className="text-[8px] uppercase tracking-wider text-muted">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
      <button
        aria-label={`Increase ${label}`}
        className="grid place-items-center bg-[#1a1d2a] px-3.5 py-3 text-accent-soft-foreground active:opacity-70"
        onClick={() => onChange(round(value + step))}
        type="button"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function CurrentSetBlock({
  exercise,
  setIndex,
  lastWeight,
  isLogging,
  onLog,
}: {
  exercise: SnapshotExercise;
  isLogging: boolean;
  lastWeight: null | number;
  onLog: (weight: null | number, reps: number) => void;
  setIndex: number;
}) {
  const planned = (exercise.sets ?? [])[setIndex];
  const repsOnly = REPS_ONLY.has(exercise.tracking_type ?? 'weight_reps');
  const plannedWeight = planned?.load_value != null ? Number(planned.load_value) : null;
  const plannedReps = planned?.reps != null ? Number(planned.reps) : 10;
  const total = (exercise.sets ?? []).length;

  const [weight, setWeight] = useState<number>(lastWeight ?? plannedWeight ?? 0);
  const [reps, setReps] = useState<number>(Number.isFinite(plannedReps) ? plannedReps : 10);

  // Reset steppers only when the current set changes (key), carrying the last
  // logged weight forward — intentionally not re-running on the value deps.
  const key = `${exercise.exercise_id}-${setIndex}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed to the set, not its values
  useEffect(() => {
    setWeight(lastWeight ?? plannedWeight ?? 0);
    setReps(Number.isFinite(plannedReps) ? plannedReps : 10);
  }, [key]);

  return (
    <div className="mt-1 border-t border-[#202026] pt-2.5">
      <p className="mb-2 text-[11px] text-muted">
        Set {setIndex + 1} of {total} · target{' '}
        {formatSet(planned?.load_value, planned?.load_unit, planned?.reps, repsOnly)}
      </p>
      <div className="mb-2.5 flex gap-2.5">
        {repsOnly ? null : (
          <Stepper
            label="KG"
            onChange={setWeight}
            step={2.5}
            value={weight}
          />
        )}
        <Stepper
          label="REPS"
          onChange={setReps}
          step={1}
          value={reps}
        />
      </div>
      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-[15px] font-extrabold text-success-foreground transition-opacity active:opacity-90 disabled:opacity-50"
        disabled={isLogging}
        onClick={() => onLog(repsOnly ? null : weight, reps)}
        type="button"
      >
        <Check size={18} />
        Log set
      </button>
    </div>
  );
}

function ActiveWorkout({session}: {session: TrainingSession}) {
  const navigate = useNavigate();
  const [createSet, {isLoading: isLogging}] = useCreateClientPerformedSetMutation();
  const [updateSession, {isLoading: isFinishing}] = useUpdateClientTrainingSessionMutation();
  const finishOverlay = useOverlayState();

  const snapshot = (session.planned_snapshot ?? {}) as {exercises?: SnapshotExercise[]; workout_name?: string};
  const exercises = [...(snapshot.exercises ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const performed = session.performed_sets;
  const assigned = assignPerformed(exercises, performed);

  const currentIndex = exercises.findIndex((ex, i) => (assigned[i] ?? []).length < (ex.sets ?? []).length);

  const handleLog = async (exercise: SnapshotExercise, setIndex: number, weight: null | number, reps: number) => {
    const planned = (exercise.sets ?? [])[setIndex];
    try {
      await createSet({
        sessionId: session.id,
        trainingPerformedSetRequest: {
          completed: true,
          exercise_id: exercise.exercise_id ?? undefined,
          exercise_name: exercise.name ?? undefined,
          load_unit: weight == null ? 'none' : ((planned?.load_unit as 'kg' | 'lbs' | null) ?? 'kg'),
          load_value: weight,
          position: performed.length,
          reps: String(reps),
          set_type: (planned?.set_type as 'dropset' | 'warmup' | 'working' | null) ?? 'working',
        },
      }).unwrap();
    } catch {
      toast.danger("Couldn't log set. Try again.");
    }
  };

  const finish = async (state: 'completed' | 'discarded') => {
    try {
      await updateSession({
        id: session.id,
        trainingSessionUpdateRequest: {ended_at: new Date().toISOString(), state},
      }).unwrap();
      finishOverlay.close();
      toast.success(state === 'completed' ? 'Workout saved' : 'Workout discarded');
      navigate(ROUTES.TRAINING);
    } catch {
      toast.danger('Something went wrong. Try again.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-[#1f1f25] px-3.5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <p className="min-w-0 flex-1 truncate font-bold">{snapshot.workout_name ?? 'Workout'}</p>
        <ElapsedClock startedAt={session.started_at} />
        <button
          className="shrink-0 rounded-md border border-success-border px-2.5 py-1 text-[11px] text-success-secondary active:opacity-70"
          onClick={finishOverlay.open}
          type="button"
        >
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {exercises.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">This workout has no exercises.</p>
        ) : (
          exercises.map((ex, i) => {
            const done = assigned[i] ?? [];
            const total = (ex.sets ?? []).length;
            const isCurrent = i === currentIndex;
            const repsOnly = REPS_ONLY.has(ex.tracking_type ?? 'weight_reps');
            const isDoneEx = total > 0 && done.length >= total;
            const lastWeight = done.length > 0 ? (done[done.length - 1]?.load_value ?? null) : null;
            return (
              <div
                className={`mb-2.5 rounded-xl border bg-surface p-3 ${
                  isCurrent
                    ? 'border-accent shadow-[0_0_0_1px_#6c8cff,0_0_20px_rgba(108,140,255,0.18)]'
                    : 'border-border opacity-50'
                }`}
                key={ex.exercise_id ?? i}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">{ex.name ?? 'Exercise'}</span>
                  {isCurrent ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-accent">● Now</span>
                  ) : (
                    <span className={`text-[11px] ${isDoneEx ? 'text-success-secondary' : 'text-muted'}`}>
                      {done.length}/{total}
                      {isDoneEx ? ' ✓' : ''}
                    </span>
                  )}
                </div>

                {done.map((p, si) => (
                  <div
                    className="grid grid-cols-[26px_1fr_26px] items-center gap-2 border-t border-[#202026] py-1.5 text-xs text-success-secondary"
                    key={p.id}
                  >
                    <span>{si + 1}</span>
                    <span className="text-[#9aa]">{formatSet(p.load_value, p.load_unit, p.reps, repsOnly)}</span>
                    <Check
                      className="text-success"
                      size={14}
                    />
                  </div>
                ))}

                {isCurrent ? (
                  <CurrentSetBlock
                    exercise={ex}
                    isLogging={isLogging}
                    lastWeight={lastWeight}
                    onLog={(w, r) => handleLog(ex, done.length, w, r)}
                    setIndex={done.length}
                  />
                ) : null}
              </div>
            );
          })
        )}

        {currentIndex === -1 && exercises.length > 0 ? (
          <Button
            className="w-full"
            isPending={isFinishing}
            onPress={() => finish('completed')}
            variant="primary"
          >
            <Check size={16} />
            Finish workout
          </Button>
        ) : null}
      </div>

      <AlertDialog.Backdrop
        isOpen={finishOverlay.isOpen}
        onOpenChange={finishOverlay.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Heading>Finish workout?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Save this workout, or discard it if it was a mistake.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isFinishing}
                onPress={() => finish('discarded')}
                variant="danger-soft"
              >
                Discard
              </Button>
              <Button
                isPending={isFinishing}
                onPress={() => finish('completed')}
                variant="primary"
              >
                Save workout
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}

export default function ActiveWorkoutScreen() {
  const navigate = useNavigate();
  const {data: sessionsData, isLoading: isLoadingList} = useListClientTrainingSessionsQuery({});
  const activeId = sessionsData?.data.find((s) => s.state === 'active')?.id;
  const {data, isLoading} = useGetClientTrainingSessionQuery({id: activeId!}, {skip: !activeId});

  if (isLoadingList || (activeId && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (!activeId || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted">No workout in progress.</p>
        <Button
          onPress={() => navigate(ROUTES.TRAINING)}
          variant="primary"
        >
          Back to training
        </Button>
      </div>
    );
  }

  return <ActiveWorkout session={data.data} />;
}
