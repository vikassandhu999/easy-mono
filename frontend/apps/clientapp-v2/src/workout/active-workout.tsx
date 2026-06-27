/**
 * Active workout — in-gym logging (spec: assets/client-training/02-active-structure,
 * 03-set-logging, 04-set-measurables, 06-finish-discard). Continuous list: current
 * exercise glows, current set is a big block whose fields are driven by the exercise's
 * tracking_type (weight / reps / time / distance) with ± steppers + a hold-timer for
 * duration, pre-filled from the plan. Done sets collapse to rows above. Full-screen.
 * New schema: planned_snapshot + performed_sets; log = create performed set;
 * finish/discard = update session state.
 *
 * Deferred to a follow-up: rest timer, tap-to-type keypad, RPE field, swap/skip/add (05).
 */
import {AlertDialog, Button, Spinner, toast, useOverlayState} from '@heroui/react';
import {Check, Minus, Pause, Play, Plus} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  type TrainingSession,
  useCreateClientPerformedSetMutation,
  useGetClientTrainingSessionQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientTrainingSessionMutation,
} from '@/api/training';
import {
  assignPerformed,
  describeSet,
  type FieldKind,
  fieldsFor,
  formatSeconds,
  type SnapshotExercise,
  type SnapshotSet,
} from '@/workout/session-utils';

type LoggedSet = {
  distance_value: null | number;
  duration_seconds: null | number;
  load_value: null | number;
  reps: null | string;
};

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

// Duration field: ± 5s steppers plus a live hold-timer (▶ counts up → fills the
// value, ⏸ stops) so planks / timed carries need no typing (spec 04).
function DurationField({value, onChange}: {onChange: (v: number) => void; value: number}) {
  const [running, setRunning] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<null | number>(null);

  const stop = () => {
    if (timer.current != null) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setRunning(false);
  };
  useEffect(() => stop, []);

  const toggle = () => {
    if (running) {
      stop();
    } else {
      setRunning(true);
      timer.current = window.setInterval(() => onChange(valueRef.current + 1), 1000);
    }
  };

  return (
    <div className="flex flex-1 items-center gap-1.5">
      <div className="flex flex-1 items-center overflow-hidden rounded-[10px] border border-[#34343d]">
        <button
          aria-label="Decrease time"
          className="grid place-items-center bg-[#1a1d2a] px-3 py-3 text-accent-soft-foreground active:opacity-70"
          onClick={() => onChange(Math.max(0, value - 5))}
          type="button"
        >
          <Minus size={16} />
        </button>
        <div className="flex-1 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wider text-muted">TIME</div>
          <div className={`text-lg font-bold tabular-nums ${running ? 'text-accent' : ''}`}>{formatSeconds(value)}</div>
        </div>
        <button
          aria-label="Increase time"
          className="grid place-items-center bg-[#1a1d2a] px-3 py-3 text-accent-soft-foreground active:opacity-70"
          onClick={() => onChange(value + 5)}
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>
      <button
        aria-label={running ? 'Stop timer' : 'Start timer'}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground active:opacity-80"
        onClick={toggle}
        type="button"
      >
        {running ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}

const STEP: Record<FieldKind, number> = {distance: 5, duration: 5, reps: 1, weight: 2.5};
const LABEL: Record<FieldKind, string> = {distance: 'METERS', duration: 'TIME', reps: 'REPS', weight: 'KG'};
const DISTANCE_LABEL: Record<string, string> = {km: 'KM', meters: 'METERS', miles: 'MILES'};

function plannedValue(planned: SnapshotSet | undefined, kind: FieldKind): null | number {
  if (!planned) {
    return null;
  }
  const raw =
    kind === 'weight'
      ? planned.load_value
      : kind === 'reps'
        ? planned.reps
        : kind === 'distance'
          ? planned.distance_value
          : planned.duration_seconds;
  return raw == null || raw === '' ? null : Number(raw);
}

const FALLBACK: Record<FieldKind, number> = {distance: 0, duration: 30, reps: 10, weight: 0};

function CurrentSetBlock({
  exercise,
  setIndex,
  carry,
  isLogging,
  onLog,
}: {
  // last logged value per field, to carry forward (e.g. weight set-to-set)
  carry: Partial<Record<FieldKind, null | number>>;
  exercise: SnapshotExercise;
  isLogging: boolean;
  onLog: (values: LoggedSet) => void;
  setIndex: number;
}) {
  const fields = fieldsFor(exercise.tracking_type);
  const planned = (exercise.sets ?? [])[setIndex];
  const total = (exercise.sets ?? []).length;

  const init = (kind: FieldKind): number => carry[kind] ?? plannedValue(planned, kind) ?? FALLBACK[kind];
  const [vals, setVals] = useState<Record<FieldKind, number>>(() => ({
    distance: init('distance'),
    duration: init('duration'),
    reps: init('reps'),
    weight: init('weight'),
  }));
  const set = (kind: FieldKind, v: number) => setVals((prev) => ({...prev, [kind]: v}));

  // Reset only when the current set changes (key) — carry weight forward.
  const key = `${exercise.exercise_id}-${setIndex}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed to the set, not its values
  useEffect(() => {
    setVals({distance: init('distance'), duration: init('duration'), reps: init('reps'), weight: init('weight')});
  }, [key]);

  const log = () =>
    onLog({
      distance_value: fields.includes('distance') ? vals.distance : null,
      duration_seconds: fields.includes('duration') ? vals.duration : null,
      load_value: fields.includes('weight') ? vals.weight : null,
      reps: fields.includes('reps') ? String(vals.reps) : null,
    });

  return (
    <div className="mt-1 border-t border-[#202026] pt-2.5">
      <p className="mb-2 text-[11px] text-muted">
        Set {setIndex + 1} of {total} · target {describeSet(exercise.tracking_type, planned ?? {})}
      </p>
      <div className="mb-2.5 flex gap-2.5">
        {fields.map((kind) =>
          kind === 'duration' ? (
            <DurationField
              key={kind}
              onChange={(v) => set('duration', v)}
              value={vals.duration}
            />
          ) : (
            <Stepper
              key={kind}
              label={kind === 'distance' ? (DISTANCE_LABEL[planned?.distance_unit ?? 'meters'] ?? 'METERS') : LABEL[kind]}
              onChange={(v) => set(kind, v)}
              step={STEP[kind]}
              value={vals[kind]}
            />
          ),
        )}
      </div>
      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-[15px] font-extrabold text-success-foreground transition-opacity active:opacity-90 disabled:opacity-50"
        disabled={isLogging}
        onClick={log}
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

  const handleLog = async (exercise: SnapshotExercise, setIndex: number, values: LoggedSet) => {
    const planned = (exercise.sets ?? [])[setIndex];
    try {
      await createSet({
        sessionId: session.id,
        trainingPerformedSetRequest: {
          completed: true,
          distance_unit:
            values.distance_value == null
              ? 'none'
              : ((planned?.distance_unit as 'km' | 'meters' | 'miles' | null) ?? 'meters'),
          distance_value: values.distance_value,
          duration_seconds: values.duration_seconds,
          exercise_id: exercise.exercise_id ?? undefined,
          exercise_name: exercise.name ?? undefined,
          load_unit: values.load_value == null ? 'none' : ((planned?.load_unit as 'kg' | 'lbs' | null) ?? 'kg'),
          load_value: values.load_value,
          position: performed.length,
          reps: values.reps ?? undefined,
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
            const isDoneEx = total > 0 && done.length >= total;
            const last = done[done.length - 1];
            const carry = {distance: last?.distance_value ?? null, weight: last?.load_value ?? null};
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
                    <span className="text-[#9aa]">{describeSet(ex.tracking_type, p)}</span>
                    <Check
                      className="text-success"
                      size={14}
                    />
                  </div>
                ))}

                {isCurrent ? (
                  <CurrentSetBlock
                    carry={carry}
                    exercise={ex}
                    isLogging={isLogging}
                    onLog={(values) => handleLog(ex, done.length, values)}
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
