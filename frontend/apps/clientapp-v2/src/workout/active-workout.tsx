/**
 * Active workout — in-gym logging (spec: assets/client-training/02-active-structure,
 * 03-set-logging, 04-set-measurables, 05-exercise-actions, 06-finish-discard).
 * Continuous list: current exercise glows, current set is a big block whose fields are
 * driven by the exercise's tracking_type (weight / reps / time / distance) with ±
 * steppers + a hold-timer for duration, pre-filled from the plan. Done sets collapse to
 * rows above. The current card carries labeled Swap / Skip actions; Add exercise sits at
 * the list bottom (added/swapped exercises persist via performed_sets + swapped_from).
 * Full-screen. log = create performed set; finish/discard = update session state.
 *
 * Deferred to a follow-up: rest timer, tap-to-type keypad, RPE field.
 */
import {AlertDialog, Button, Spinner, toast, useOverlayState} from '@heroui/react';
import {Check, Minus, Pause, Play, Plus, Repeat2, SkipForward, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import {useListClientExercisesQuery} from '@/api/generated';
import {
  type TrainingSession,
  useCreateClientPerformedSetMutation,
  useGetClientTrainingSessionQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientTrainingSessionMutation,
} from '@/api/training';
import {
  addedExercises,
  assignPerformed,
  describeSet,
  type FieldKind,
  fieldsFor,
  formatSeconds,
  formatVolume,
  type SnapshotExercise,
  type SnapshotSet,
  sessionVolumeKg,
  snapshotExercises,
} from '@/workout/session-utils';

type LoggedSet = {
  distance_value: null | number;
  duration_seconds: null | number;
  load_value: null | number;
  reps: null | string;
};

// An exercise picked from the library, for swap or add.
type Picked = {id: string; name: string; tracking_type: string};

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
  // clear the interval on unmount — reads the ref, so no stale-closure dep
  useEffect(
    () => () => {
      if (timer.current != null) {
        clearInterval(timer.current);
      }
    },
    [],
  );

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
  total,
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
  // planned set count, or null for open-ended (added) exercises
  total: null | number;
}) {
  const fields = fieldsFor(exercise.tracking_type);
  const planned = (exercise.sets ?? [])[setIndex];
  const hasTarget =
    !!planned &&
    (planned.load_value != null ||
      planned.reps != null ||
      planned.duration_seconds != null ||
      planned.distance_value != null);

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
        Set {setIndex + 1}
        {total != null ? ` of ${total}` : ''}
        {hasTarget ? ` · target ${describeSet(exercise.tracking_type, planned ?? {})}` : ''}
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
              label={
                kind === 'distance' ? (DISTANCE_LABEL[planned?.distance_unit ?? 'meters'] ?? 'METERS') : LABEL[kind]
              }
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

// Labeled, full-word action button on the current card (spec 05, option A).
function ActionButton({label, onPress, children}: {children: React.ReactNode; label: string; onPress: () => void}) {
  return (
    <button
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#34343d] py-2.5 text-xs font-semibold text-[#cbd2e6] active:bg-surface-secondary"
      onClick={onPress}
      type="button"
    >
      {children}
      {label}
    </button>
  );
}

// Full-screen library search for swap / add. Debounced name search.
function ExercisePicker({title, onPick, onClose}: {onClose: () => void; onPick: (e: Picked) => void; title: string}) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const {data, isFetching} = useListClientExercisesQuery({limit: 30, search: search || undefined});
  const items = data?.data ?? [];

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-[#1f1f25] px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted active:bg-surface-secondary"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
        <input
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          onChange={(e) => setQ(e.target.value)}
          placeholder={title}
          ref={inputRef}
          value={q}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {isFetching && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No exercises found.</p>
        ) : (
          items.map((e) => (
            <button
              className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-secondary"
              key={e.id}
              onClick={() => onPick({id: e.id, name: e.name, tracking_type: e.tracking_type ?? 'weight_reps'})}
              type="button"
            >
              <span className="min-w-0 truncate font-medium">{e.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{(e.tracking_type ?? '').replace(/_/g, ' ')}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

type Card = {
  added: boolean;
  badge: null | {from: string} | 'added';
  done: ReturnType<typeof assignPerformed>[number];
  id: string;
  // synthetic exercise driving the set block (swap/added substitute the planned one)
  exercise: SnapshotExercise;
  logSwappedFrom: null | string;
  name: string;
  plannedIndex: null | number;
  removable: boolean;
  total: null | number;
};

// Soft-intake soreness scale (1–5) shown on the finish wrap-up.
const SORENESS_OPTIONS = [
  {rating: 1, emoji: '😎', label: 'Fresh'},
  {rating: 2, emoji: '🙂', label: 'Easy'},
  {rating: 3, emoji: '😮‍💨', label: 'Worked'},
  {rating: 4, emoji: '🥵', label: 'Hard'},
  {rating: 5, emoji: '💀', label: 'Brutal'},
];

function ActiveWorkout({session}: {session: TrainingSession}) {
  const navigate = useNavigate();
  const [createSet, {isLoading: isLogging}] = useCreateClientPerformedSetMutation();
  const [updateSession, {isLoading: isFinishing}] = useUpdateClientTrainingSessionMutation();
  const finishOverlay = useOverlayState();

  // Client-side session edits — the planned_snapshot is immutable, so swap/skip/add
  // live in component state for the session (a reload re-derives from performed_sets).
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  const [swaps, setSwaps] = useState<Map<number, Picked>>(() => new Map());
  const [added, setAdded] = useState<Picked[]>([]);
  const [doneAdded, setDoneAdded] = useState<Set<string>>(() => new Set());
  const [picker, setPicker] = useState<null | {index: number; mode: 'swap'} | {mode: 'add'}>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const workoutName = (session.planned_snapshot as {workout_name?: string} | null)?.workout_name ?? 'Workout';
  const planned = snapshotExercises(session);
  const performed = session.performed_sets;
  const summary = {
    sets: performed.length,
    exercises: new Set(performed.map((p) => p.exercise_id)).size,
    volume: formatVolume(sessionVolumeKg(performed)),
  };
  const assigned = assignPerformed(planned, performed);
  const extra = addedExercises(planned, performed);

  const cards: Card[] = planned.map((ex, i) => {
    const swap = swaps.get(i) ?? null;
    const total = (ex.sets ?? []).length;
    return {
      added: false,
      badge: swap ? {from: ex.name ?? 'planned'} : null,
      done: assigned[i] ?? [],
      exercise: swap
        ? {
            exercise_id: swap.id,
            name: swap.name,
            sets: Array.from({length: total}, () => ({})),
            tracking_type: swap.tracking_type,
          }
        : ex,
      id: `p${i}`,
      logSwappedFrom: swap ? (ex.exercise_id ?? null) : null,
      name: swap ? swap.name : (ex.name ?? 'Exercise'),
      plannedIndex: i,
      removable: false,
      total,
    };
  });
  for (const a of added) {
    const done = extra.get(a.id) ?? [];
    cards.push({
      added: true,
      badge: 'added',
      done,
      exercise: {exercise_id: a.id, name: a.name, sets: [], tracking_type: a.tracking_type},
      id: `a${a.id}`,
      logSwappedFrom: null,
      name: a.name,
      plannedIndex: null,
      removable: done.length === 0,
      total: null,
    });
  }

  const currentId = (() => {
    for (const c of cards) {
      if (c.plannedIndex != null) {
        if (!skipped.has(c.plannedIndex) && (c.total ?? 0) > c.done.length) {
          return c.id;
        }
      } else if (!doneAdded.has(c.exercise.exercise_id ?? '')) {
        return c.id;
      }
    }
    return null;
  })();

  const handleLog = async (card: Card, values: LoggedSet) => {
    const plannedSet = (card.exercise.sets ?? [])[card.done.length];
    try {
      await createSet({
        sessionId: session.id,
        trainingPerformedSetRequest: {
          completed: true,
          distance_unit:
            values.distance_value == null
              ? 'none'
              : ((plannedSet?.distance_unit as 'km' | 'meters' | 'miles' | null) ?? 'meters'),
          distance_value: values.distance_value,
          duration_seconds: values.duration_seconds,
          exercise_id: card.exercise.exercise_id ?? undefined,
          exercise_name: card.name,
          load_unit: values.load_value == null ? 'none' : ((plannedSet?.load_unit as 'kg' | 'lbs' | null) ?? 'kg'),
          load_value: values.load_value,
          position: performed.length,
          reps: values.reps ?? undefined,
          set_type: (plannedSet?.set_type as 'dropset' | 'warmup' | 'working' | null) ?? 'working',
          swapped_from_exercise_id: card.logSwappedFrom ?? undefined,
        },
      }).unwrap();
    } catch {
      toast.danger("Couldn't log set. Try again.");
    }
  };

  const onPick = (e: Picked) => {
    if (!picker) {
      return;
    }
    if (picker.mode === 'swap') {
      setSwaps((m) => new Map(m).set(picker.index, e));
      setSkipped((s) => {
        const n = new Set(s);
        n.delete(picker.index);
        return n;
      });
    } else {
      setAdded((a) => [...a, e]);
    }
    setPicker(null);
  };

  const finish = async (state: 'completed' | 'discarded') => {
    // Soft intake: soreness + note are captured on save but never required.
    const body: {ended_at: string; state: 'completed' | 'discarded'; soreness_rating?: number; notes?: string} = {
      ended_at: new Date().toISOString(),
      state,
    };
    if (state === 'completed') {
      if (soreness != null) {
        body.soreness_rating = soreness;
      }
      if (note.trim()) {
        body.notes = note.trim();
      }
    }
    try {
      await updateSession({id: session.id, trainingSessionUpdateRequest: body}).unwrap();
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
        <p className="min-w-0 flex-1 truncate font-bold">{workoutName}</p>
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
        {cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">This workout has no exercises.</p>
        ) : (
          cards.map((c) => {
            const isCurrent = c.id === currentId;
            const isSkipped = c.plannedIndex != null && skipped.has(c.plannedIndex);
            const isDoneEx = c.total != null && c.total > 0 && c.done.length >= c.total;
            const last = c.done[c.done.length - 1];
            const carry = {distance: last?.distance_value ?? null, weight: last?.load_value ?? null};
            return (
              <div
                className={`mb-2.5 rounded-xl border bg-surface p-3 ${
                  isCurrent
                    ? 'border-accent shadow-[0_0_0_1px_#6c8cff,0_0_20px_rgba(108,140,255,0.18)]'
                    : 'border-border opacity-50'
                }`}
                key={c.id}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`truncate font-semibold ${isSkipped ? 'text-muted' : ''}`}>{c.name}</span>
                    {c.badge === 'added' ? (
                      <span className="shrink-0 rounded border border-[#7d5a2f] px-1.5 py-px text-[9px] text-warning">
                        added
                      </span>
                    ) : c.badge ? (
                      <span className="shrink-0 rounded border border-[#34506e] px-1.5 py-px text-[9px] text-[#9fb0ff]">
                        swapped from {c.badge.from}
                      </span>
                    ) : null}
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-accent">● Now</span>
                  ) : isSkipped ? (
                    <span className="shrink-0 rounded border border-[#3a3a42] px-1.5 py-px text-[9px] text-muted">
                      skipped
                    </span>
                  ) : (
                    <span className={`shrink-0 text-[11px] ${isDoneEx ? 'text-success-secondary' : 'text-muted'}`}>
                      {c.done.length}
                      {c.total != null ? `/${c.total}` : ' sets'}
                      {isDoneEx ? ' ✓' : ''}
                    </span>
                  )}
                </div>

                {c.done.map((p, si) => (
                  <div
                    className="grid grid-cols-[26px_1fr_26px] items-center gap-2 border-t border-[#202026] py-1.5 text-xs text-success-secondary"
                    key={p.id}
                  >
                    <span>{si + 1}</span>
                    <span className="text-[#9aa]">{describeSet(c.exercise.tracking_type, p)}</span>
                    <Check
                      className="text-success"
                      size={14}
                    />
                  </div>
                ))}

                {isCurrent ? (
                  <>
                    <CurrentSetBlock
                      carry={carry}
                      exercise={c.exercise}
                      isLogging={isLogging}
                      key={`${c.id}-${c.done.length}`}
                      onLog={(values) => handleLog(c, values)}
                      setIndex={c.done.length}
                      total={c.total}
                    />
                    <div className="mt-2 flex gap-2">
                      {c.added ? (
                        <>
                          <ActionButton
                            label="Done"
                            onPress={() => setDoneAdded((s) => new Set(s).add(c.exercise.exercise_id ?? ''))}
                          >
                            <Check size={14} />
                          </ActionButton>
                          {c.removable ? (
                            <ActionButton
                              label="Remove"
                              onPress={() => setAdded((a) => a.filter((x) => x.id !== c.exercise.exercise_id))}
                            >
                              <X size={14} />
                            </ActionButton>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <ActionButton
                            label="Swap exercise"
                            onPress={() => setPicker({index: c.plannedIndex as number, mode: 'swap'})}
                          >
                            <Repeat2 size={14} />
                          </ActionButton>
                          <ActionButton
                            label="Skip"
                            onPress={() => setSkipped((s) => new Set(s).add(c.plannedIndex as number))}
                          >
                            <SkipForward size={14} />
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })
        )}

        <button
          className="mb-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 py-2.5 text-sm font-medium text-muted active:bg-surface-secondary"
          onClick={() => setPicker({mode: 'add'})}
          type="button"
        >
          <Plus size={16} />
          Add exercise
        </button>

        {currentId == null && cards.length > 0 ? (
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

      {picker ? (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={onPick}
          title={picker.mode === 'swap' ? 'Swap to…' : 'Add exercise…'}
        />
      ) : null}

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
            <AlertDialog.Body>
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {label: 'SETS', value: String(summary.sets)},
                    {label: 'EX', value: String(summary.exercises)},
                    {label: 'VOL', value: summary.volume},
                  ].map((stat) => (
                    <div
                      className="rounded-lg border border-border bg-surface px-2 py-2 text-center"
                      key={stat.label}
                    >
                      <p className="text-lg font-bold leading-none">{stat.value}</p>
                      <p className="mt-1 text-[10px] tracking-wide text-muted">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Soreness — optional */}
                <div>
                  <p className="mb-1.5 text-xs text-muted">How did it feel?</p>
                  <div className="flex justify-between gap-1">
                    {SORENESS_OPTIONS.map((opt) => (
                      <button
                        aria-label={opt.label}
                        aria-pressed={soreness === opt.rating}
                        className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 transition-colors ${
                          soreness === opt.rating ? 'border-accent bg-accent/10' : 'border-border'
                        }`}
                        key={opt.rating}
                        onClick={() => setSoreness((cur) => (cur === opt.rating ? null : opt.rating))}
                        type="button"
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-[9px] text-muted">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note — optional */}
                <textarea
                  className="min-h-16 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for your coach (optional)"
                  value={note}
                />
              </div>
            </AlertDialog.Body>
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
