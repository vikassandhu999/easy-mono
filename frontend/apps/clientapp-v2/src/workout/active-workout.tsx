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
import {Button, Spinner, toast, useOverlayState} from '@heroui/react';
import {Check, ChevronDown, Minus, Pause, Play, Plus, Repeat2, SkipForward, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ROUTES} from '@/@config/routes';
import {useListClientExercisesQuery} from '@/api/generated';
import {
  type TrainingSession,
  useCreateClientPerformedSetMutation,
  useDeleteClientPerformedSetMutation,
  useGetClientTrainingSessionQuery,
  useListClientTrainingSessionsQuery,
  useUpdateClientPerformedSetMutation,
  useUpdateClientTrainingSessionMutation,
} from '@/api/training';
import {
  addedExercises,
  assignPerformed,
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
      <div className="flex flex-1 items-center overflow-hidden rounded-[10px] border border-border">
        <button
          aria-label="Decrease time"
          className="grid place-items-center bg-surface-secondary px-3 py-3 text-accent-soft-foreground active:opacity-70"
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
          className="grid place-items-center bg-surface-secondary px-3 py-3 text-accent-soft-foreground active:opacity-70"
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

const LABEL: Record<FieldKind, string> = {distance: 'METERS', duration: 'TIME', reps: 'REPS', weight: 'KG'};
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

function SetRow({
  exercise,
  index,
  logged,
  busy,
  onComplete,
  onDelete,
  onUpdate,
}: {
  busy: boolean;
  exercise: SnapshotExercise;
  index: number;
  logged?: ReturnType<typeof assignPerformed>[number][number];
  onComplete: (values: LoggedSet, restSeconds: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, values: LoggedSet) => void;
}) {
  const fields = fieldsFor(exercise.tracking_type);
  const planned = (exercise.sets ?? [])[index];
  const initial = (kind: FieldKind) => {
    if (logged) {
      const value =
        kind === 'weight'
          ? logged.load_value
          : kind === 'reps'
            ? logged.reps
            : kind === 'distance'
              ? logged.distance_value
              : logged.duration_seconds;
      if (value != null && value !== '') {
        return Number(value);
      }
    }
    return plannedValue(planned, kind) ?? FALLBACK[kind];
  };
  const [values, setValues] = useState<Record<FieldKind, number>>(() => ({
    distance: initial('distance'),
    duration: initial('duration'),
    reps: initial('reps'),
    weight: initial('weight'),
  }));
  const payload = (): LoggedSet => ({
    distance_value: fields.includes('distance') ? values.distance : null,
    duration_seconds: fields.includes('duration') ? values.duration : null,
    load_value: fields.includes('weight') ? values.weight : null,
    reps: fields.includes('reps') ? String(values.reps) : null,
  });
  const change = (kind: FieldKind, value: number) => setValues((current) => ({...current, [kind]: Math.max(0, value)}));

  return (
    <div
      className={`grid grid-cols-[28px_1fr_42px] items-center gap-2 rounded-[13px] p-1.5 ${logged ? 'bg-[#eef7f1]' : 'bg-surface-secondary'}`}
    >
      <span className="text-center text-xs font-extrabold text-muted">{index + 1}</span>
      <div className="flex min-w-0 gap-1.5">
        {fields.map((kind) =>
          kind === 'duration' ? (
            <DurationField
              key={kind}
              onChange={(value) => change(kind, value)}
              value={values[kind]}
            />
          ) : (
            <label
              className="min-w-0 flex-1"
              key={kind}
            >
              <span className="sr-only">{LABEL[kind]}</span>
              <input
                aria-label={`${LABEL[kind]} set ${index + 1}`}
                className="h-11 w-full rounded-[10px] border border-field-border bg-white px-1 text-center text-base font-extrabold outline-none focus:border-accent"
                inputMode="decimal"
                onBlur={() => logged && onUpdate(logged.id, payload())}
                onChange={(event) => change(kind, Number(event.target.value))}
                type="text"
                value={values[kind]}
              />
            </label>
          ),
        )}
      </div>
      <button
        aria-label={logged ? `Mark set ${index + 1} incomplete` : `Complete set ${index + 1}`}
        className={`grid size-10 place-items-center rounded-[11px] border-2 ${logged ? 'border-success bg-success text-white' : 'border-field-border bg-white text-muted'}`}
        disabled={busy}
        onClick={() => (logged ? onDelete(logged.id) : onComplete(payload(), planned?.rest_seconds ?? 90))}
        type="button"
      >
        {logged ? <Check size={18} /> : null}
      </button>
    </div>
  );
}

function EditableSetTable({
  card,
  busy,
  onComplete,
  onDelete,
  onUpdate,
}: {
  busy: boolean;
  card: Card;
  onComplete: (index: number, values: LoggedSet, restSeconds: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, values: LoggedSet) => void;
}) {
  const count = card.total ?? Math.max(card.done.length + 1, 1);
  return (
    <div className="mt-4 space-y-1.5">
      {Array.from({length: count}, (_, index) => (
        <SetRow
          busy={busy}
          exercise={card.exercise}
          index={index}
          key={card.done[index]?.id ?? `${card.id}-${index}`}
          logged={card.done[index]}
          onComplete={(values, restSeconds) => onComplete(index, values, restSeconds)}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

// Labeled, full-word action button on the current card (spec 05, option A).
function ActionButton({label, onPress, children}: {children: React.ReactNode; label: string; onPress: () => void}) {
  return (
    <button
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border py-2.5 text-xs font-semibold text-foreground active:bg-surface-secondary"
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
      <div className="flex items-center gap-2 border-b border-border px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
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

function ActiveWorkout({session, refetch}: {refetch: () => Promise<unknown>; session: TrainingSession}) {
  const navigate = useNavigate();
  const [createSet, {isLoading: isLogging}] = useCreateClientPerformedSetMutation();
  const [updateSet, {isLoading: isUpdating}] = useUpdateClientPerformedSetMutation();
  const [deleteSet, {isLoading: isDeleting}] = useDeleteClientPerformedSetMutation();
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
  const [rest, setRest] = useState<null | {left: number; total: number}>(null);
  useEffect(() => {
    if (!rest || rest.left <= 0) {
      return;
    }
    const timer = window.setTimeout(
      () => setRest((current) => (current ? {...current, left: Math.max(0, current.left - 1)} : null)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [rest]);
  useEffect(() => {
    if (rest?.left === 0) {
      setRest(null);
    }
  }, [rest?.left]);

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
  const currentCard = cards.find((card) => card.id === currentId) ?? null;
  const currentPosition = currentCard ? cards.indexOf(currentCard) : -1;
  const completedCards = cards.filter(
    (card) =>
      (card.total != null && card.done.length >= card.total) ||
      (card.plannedIndex != null && skipped.has(card.plannedIndex)) ||
      (card.added && doneAdded.has(card.exercise.exercise_id ?? '')),
  );
  const upNext =
    currentPosition < 0 ? [] : cards.slice(currentPosition + 1).filter((card) => !completedCards.includes(card));
  const overallTotal = cards.reduce((total, card) => total + (card.total ?? card.done.length), 0);
  const overallDone = cards.reduce((total, card) => total + card.done.length, 0);

  const handleLog = async (card: Card, setIndex: number, values: LoggedSet, restSeconds: number) => {
    const plannedSet = (card.exercise.sets ?? [])[setIndex];
    const cardPosition = cards
      .slice(0, cards.indexOf(card))
      .reduce((total, item) => total + (item.total ?? item.done.length + 1), 0);
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
          position: cardPosition + setIndex,
          reps: values.reps ?? undefined,
          set_type: (plannedSet?.set_type as 'dropset' | 'warmup' | 'working' | null) ?? 'working',
          swapped_from_exercise_id: card.logSwappedFrom ?? undefined,
        },
      }).unwrap();
      setRest({left: restSeconds, total: restSeconds});
    } catch {
      toast.danger("Couldn't log set. Try again.");
    }
  };

  const handleUpdate = async (id: string, values: LoggedSet) => {
    try {
      await updateSet({id, trainingPerformedSetRequest: {...values, completed: true}}).unwrap();
      await refetch();
    } catch {
      toast.danger("Couldn't update set. Try again.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSet({id}).unwrap();
      setRest(null);
      await refetch();
    } catch {
      toast.danger("Couldn't update set. Try again.");
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
      <div className="sticky top-0 z-10 border-b border-border bg-[rgba(244,244,242,0.96)] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-[10px]">
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Minimize workout"
            className="-ml-2 grid size-9 shrink-0 place-items-center rounded-[10px] text-muted"
            onClick={() => navigate(ROUTES.TRAINING)}
            type="button"
          >
            <ChevronDown size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{workoutName}</p>
            <ElapsedClock startedAt={session.started_at} />
          </div>
          <button
            className="shrink-0 rounded-[11px] border border-success-border bg-[#eaf7f0] px-4 py-2 text-[13px] font-extrabold text-success-secondary"
            onClick={finishOverlay.open}
            type="button"
          >
            Finish
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#e6e7e4]">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{width: `${overallTotal ? (overallDone / overallTotal) * 100 : 0}%`}}
            />
          </div>
          <span className="text-[11px] font-bold text-muted">
            {overallDone}/{overallTotal} sets
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {rest ? (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#d6e6fb] bg-accent-soft p-3">
            <div className="relative grid size-10 place-items-center rounded-full border-4 border-[#d6e6fb] text-sm font-extrabold text-accent">
              {rest.left}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Rest</span>
              <b className="text-xl">{formatSeconds(rest.left)}</b>
            </div>
            <button
              className="rounded-[10px] border border-border bg-white px-3 py-2 text-xs font-extrabold"
              onClick={() =>
                setRest((current) =>
                  current ? {...current, left: Math.min(current.total + 60, current.left + 15)} : null,
                )
              }
              type="button"
            >
              +15s
            </button>
            <button
              className="rounded-[10px] bg-accent px-3 py-2 text-xs font-extrabold text-white"
              onClick={() => setRest(null)}
              type="button"
            >
              Skip
            </button>
          </div>
        ) : null}
        {cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">This workout has no exercises.</p>
        ) : currentCard ? (
          <div className="mb-5 rounded-3xl bg-surface p-4 shadow-[0_0_0_1.5px_#0485f7,0_10px_24px_-18px_rgba(18,20,26,0.28)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-accent">
                Exercise {currentPosition + 1} of {cards.length}
              </span>
              <span className="text-xs font-bold text-muted">
                {currentCard.exercise.tracking_type?.replaceAll('_', ' ')}
              </span>
            </div>
            <h2 className="text-[25px] font-extrabold leading-[1.05] tracking-[-0.025em]">{currentCard.name}</h2>
            {currentCard.badge && currentCard.badge !== 'added' ? (
              <span className="mt-2 inline-block rounded-lg bg-accent-soft px-2 py-1 text-[10px] text-accent-soft-foreground">
                Swapped from {currentCard.badge.from}
              </span>
            ) : null}
            <p className="mt-4 text-xs font-extrabold">
              {currentCard.done.length} <span className="text-muted">of {currentCard.total ?? 'open'} sets done</span>
            </p>
            <EditableSetTable
              busy={isLogging || isUpdating || isDeleting}
              card={currentCard}
              onComplete={(index, values, restSeconds) => handleLog(currentCard, index, values, restSeconds)}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
            <div className="mt-3 flex gap-2">
              {currentCard.added ? (
                <>
                  <ActionButton
                    label="Next"
                    onPress={() =>
                      setDoneAdded((current) => new Set(current).add(currentCard.exercise.exercise_id ?? ''))
                    }
                  >
                    <Check size={14} />
                  </ActionButton>
                  {currentCard.removable ? (
                    <ActionButton
                      label="Remove"
                      onPress={() =>
                        setAdded((items) => items.filter((item) => item.id !== currentCard.exercise.exercise_id))
                      }
                    >
                      <X size={14} />
                    </ActionButton>
                  ) : null}
                </>
              ) : (
                <>
                  <ActionButton
                    label="Swap"
                    onPress={() => setPicker({index: currentCard.plannedIndex as number, mode: 'swap'})}
                  >
                    <Repeat2 size={14} />
                  </ActionButton>
                  <ActionButton
                    label="Next"
                    onPress={() => setSkipped((current) => new Set(current).add(currentCard.plannedIndex as number))}
                  >
                    <SkipForward size={14} />
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-success-border bg-[#eef7f1] p-4 text-center text-success-secondary">
            <Check
              className="mx-auto mb-1"
              size={24}
            />
            <b>All exercises complete</b>
          </div>
        )}

        {upNext.length > 0 ? (
          <>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Up next</p>
            <div className="mb-4 overflow-hidden rounded-[20px] border border-border bg-surface">
              {upNext.map((card) => (
                <div
                  className="flex items-center justify-between border-t border-separator p-3 first:border-t-0"
                  key={card.id}
                >
                  <span className="text-sm font-bold">{card.name}</span>
                  <span className="text-[11px] text-muted">{card.total ?? 'open'} sets</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {completedCards.length > 0 ? (
          <>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">Completed</p>
            <div className="mb-4 overflow-hidden rounded-[20px] border border-border bg-surface">
              {completedCards.map((card) => (
                <div
                  className="flex items-center justify-between border-t border-separator p-3 first:border-t-0"
                  key={card.id}
                >
                  <span className="text-sm font-bold text-muted">{card.name}</span>
                  <span className="text-success-secondary">✓</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

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

      {finishOverlay.isOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(8,8,11,0.5)]">
          <button
            aria-label="Keep training"
            className="flex-1 cursor-default"
            onClick={finishOverlay.close}
            type="button"
          />
          <div
            aria-label="Finish workout"
            aria-modal="true"
            className="rounded-t-[28px] bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
            role="dialog"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#c3c7ce]" />
            <h2 className="mb-4 text-[21px] font-extrabold tracking-[-0.02em]">Nice work — finish up?</h2>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                {label: 'SETS', value: String(summary.sets)},
                {label: 'EX', value: String(summary.exercises)},
                {label: 'VOL', value: summary.volume},
              ].map((stat) => (
                <div
                  className="rounded-xl border border-border bg-surface p-2 text-center"
                  key={stat.label}
                >
                  <b className="block text-lg">{stat.value}</b>
                  <span className="text-[9px] font-bold text-muted">{stat.label}</span>
                </div>
              ))}
            </div>
            <p className="mb-2 text-xs font-bold text-muted">How did it feel?</p>
            <div className="mb-4 flex gap-1.5">
              {SORENESS_OPTIONS.map((option) => (
                <button
                  aria-label={option.label}
                  aria-pressed={soreness === option.rating}
                  className={`flex flex-1 flex-col items-center rounded-xl border py-2 ${soreness === option.rating ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
                  key={option.rating}
                  onClick={() => setSoreness((current) => (current === option.rating ? null : option.rating))}
                  type="button"
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span className="text-[9px] text-muted">{option.label}</span>
                </button>
              ))}
            </div>
            <textarea
              className="mb-3 min-h-16 w-full resize-none rounded-xl border border-field-border bg-white p-3 text-sm outline-none focus:border-accent"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note for your coach (optional)"
              value={note}
            />
            <button
              className="min-h-[50px] w-full rounded-[14px] bg-accent text-[15px] font-extrabold text-white disabled:opacity-50"
              disabled={isFinishing}
              onClick={() => finish('completed')}
              type="button"
            >
              Save workout
            </button>
            <div className="mt-2 flex gap-2">
              <button
                className="min-h-11 flex-1 rounded-[13px] border border-border bg-white text-sm font-bold text-muted"
                onClick={finishOverlay.close}
                type="button"
              >
                Keep training
              </button>
              <button
                className="min-h-11 flex-1 rounded-[13px] border border-border bg-white text-sm font-bold text-danger"
                disabled={isFinishing}
                onClick={() => finish('discarded')}
                type="button"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ActiveWorkoutScreen() {
  const navigate = useNavigate();
  const {data: sessionsData, isLoading: isLoadingList} = useListClientTrainingSessionsQuery({});
  const activeId = sessionsData?.data.find((s) => s.state === 'active')?.id;
  const {data, isLoading, refetch} = useGetClientTrainingSessionQuery({id: activeId!}, {skip: !activeId});

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

  return (
    <ActiveWorkout
      refetch={refetch}
      session={data.data}
    />
  );
}
