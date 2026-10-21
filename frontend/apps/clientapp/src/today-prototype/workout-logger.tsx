// PROTOTYPE. Shows and records one workout (C3). Before Start it is a read-only preview. The log is `active` until
// Finish or Discard (W18); a finished log can be edited or deleted (C6). Sets link to the prescribed exercise
// (W19, W38); a swap keeps the link and names the exercise done instead. One set per side for a one-side exercise
// (W27). Typed values and added rounds stay on the log until they are recorded (N41).
import {Check, Plus, Repeat} from 'lucide-react';
import {useState} from 'react';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Confirm} from '../ui/confirm';
import {
  actions,
  type DoneExercise,
  dayLabel,
  difficultyLabel,
  exerciseChoices,
  type Metric,
  rowKey,
  type SetLog,
  type Target,
  targetText,
  type Workout,
  type WorkoutExercise,
  type WorkoutLog,
} from './model';
import {Choice, Field, ScreenHeader, useFocusOnMount} from './parts';

const metricLabel: Record<Metric, string> = {reps: 'Reps', weight: 'kg', duration: 'Seconds'};

type Row = {
  exercise: WorkoutExercise;
  done: DoneExercise;
  round: number;
  side: SetLog['side'];
  extra: boolean;
  target: Target;
};

// Every row of an exercise: planned rounds, rounds the client added, and any recorded beyond them.
function rowsOf(log: WorkoutLog | null, exercise: WorkoutExercise, rounds: number): Row[] {
  const done = log?.swaps[exercise.id] ?? exercise;
  const recorded = Math.max(
    0,
    ...(log?.sets ?? []).filter((set) => set.exerciseId === exercise.id).map((set) => set.round),
  );
  const total = Math.max(rounds + (log?.extraRounds[exercise.id] ?? 0), recorded);
  const rows: Row[] = [];
  for (let round = 1; round <= total; round++) {
    const target = exercise.targets[Math.min(round, exercise.targets.length) - 1] ?? {};
    for (const side of exercise.unilateral ? (['L', 'R'] as const) : [null]) {
      rows.push({exercise, done, round, side, extra: round > rounds, target});
    }
  }
  return rows;
}

const targetLine = (target: Target, metrics: Metric[]) =>
  metrics
    .map((metric) => targetText(target, metric))
    .filter((text) => text !== 'any')
    .join(' · ') || 'your choice';

const inputOf = (log: WorkoutLog, row: Row, metric: Metric) => {
  const typed = log.inputs[rowKey(row.exercise.id, row.round, row.side)]?.[metric];
  if (typed !== undefined) {
    return typed;
  }
  const set = log.sets.find((s) => s.exerciseId === row.exercise.id && s.round === row.round && s.side === row.side);
  const value = set?.values[metric] ?? row.target[metric];
  return typeof value === 'number' ? String(value) : '';
};

const numbersOf = (log: WorkoutLog, row: Row) =>
  Object.fromEntries(
    row.done.metrics.flatMap((metric) => {
      const value = Number(inputOf(log, row, metric).replace(',', '.'));
      return value > 0 ? [[metric, value]] : [];
    }),
  ) as SetLog['values'];

export function WorkoutLogger({
  workout,
  log,
  date,
  time,
  coach,
  back,
  canStart,
  onStart,
  onChange,
  onFinish,
  onDiscard,
  onDelete,
  onClose,
}: {
  workout: Workout;
  log: WorkoutLog | null; // null = preview before Start
  date: string;
  time: string | null;
  coach: string | undefined;
  back: string;
  canStart: boolean;
  onStart: () => void;
  onChange: (log: WorkoutLog) => void;
  onFinish: (log: WorkoutLog) => void;
  onDiscard: (log: WorkoutLog) => void;
  onDelete: (log: WorkoutLog) => void;
  onClose: () => void;
}) {
  const heading = useFocusOnMount();
  const [swapping, setSwapping] = useState<{exercise: WorkoutExercise; to?: DoneExercise} | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const editable = log?.state === 'active';
  const allRows = workout.groups.flatMap((group) =>
    group.exercises.flatMap((exercise) => rowsOf(log, exercise, group.rounds)),
  );
  const plannedRows = allRows.filter((row) => !row.extra);
  const isRecorded = (row: Row) =>
    Boolean(log?.sets.some((s) => s.exerciseId === row.exercise.id && s.round === row.round && s.side === row.side));
  const unticked = log ? plannedRows.filter((row) => !isRecorded(row)) : [];
  const state = !log ? 'Not started' : log.state === 'completed' ? 'Done' : 'In progress · sets save as you tick them';

  const swap = (exercise: WorkoutExercise, to: DoneExercise) => {
    if (!log) {
      return;
    }
    const swaps = {...log.swaps};
    if (to.name === exercise.name) {
      delete swaps[exercise.id];
    } else {
      swaps[exercise.id] = to;
    }
    // Recorded values belong to the old exercise's metrics.
    const sets = log.sets.filter((set) => set.exerciseId !== exercise.id);
    onChange({...log, swaps, sets});
    setSwapping(null);
  };

  return (
    <main className="page pb-44">
      <ScreenHeader
        title={workout.name}
        subtitle={`${dayLabel(date)}${time ? ` · planned ${time}` : ''} · ${state}`}
        back={back}
        onBack={onClose}
        headingRef={heading}
      />

      {workout.instructions && (
        <p className="mb-5 rounded-2xl bg-[var(--coach)] px-4 py-3 leading-relaxed">{workout.instructions}</p>
      )}
      {workout.type === 'video' && (
        <div className="mb-5 grid aspect-video place-items-center rounded-2xl bg-foreground text-background">
          <span className="font-semibold">Video plays here</span>
        </div>
      )}

      {log?.state === 'completed' && log.difficulty && (
        <p className="mb-5 rounded-2xl bg-[var(--progress)] px-4 py-3 font-semibold">
          {difficultyLabel[log.difficulty]}
          {log.pain ? ` · Pain: ${log.painNote || 'yes'}` : ' · No pain'} · {log.sets.length} sets
        </p>
      )}

      {workout.groups.map((group) => (
        <section
          key={group.id}
          aria-label={group.label}
          className="mb-6"
        >
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">
            {group.label} · {group.rounds} rounds
          </h2>
          <div className="grid gap-3">
            {group.exercises.map((exercise, index) => {
              const rows = rowsOf(log, exercise, group.rounds);
              const done = rows[0]?.done ?? exercise;
              const swapped = done !== exercise;
              return (
                <div
                  key={exercise.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">
                        <span className="mr-2 text-muted-foreground tabular-nums">
                          {group.label.charAt(0)}
                          {index + 1}
                        </span>
                        {done.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {swapped ? `Instead of ${exercise.name} · ` : ''}
                        {exercise.unilateral ? 'Each side · ' : ''}
                        {exercise.rest}
                      </p>
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Swap ${done.name}`}
                        onPress={() => setSwapping({exercise})}
                      >
                        <Repeat />
                        Swap
                      </Button>
                    )}
                  </div>
                  {log ? (
                    <div
                      role="group"
                      aria-label={`Sets for ${done.name}`}
                      className="mt-3 grid gap-2"
                    >
                      <div
                        aria-hidden="true"
                        className="grid grid-cols-[4.5rem_1fr_3rem] gap-2 text-sm font-semibold text-muted-foreground"
                      >
                        <span>Set</span>
                        <span
                          className="grid gap-2"
                          style={{gridTemplateColumns: `repeat(${done.metrics.length}, minmax(0, 1fr))`}}
                        >
                          {done.metrics.map((metric) => (
                            <span key={metric}>{metricLabel[metric]}</span>
                          ))}
                        </span>
                      </div>
                      {rows.map((row) => (
                        <SetRow
                          key={`${done.name}-${row.round}-${row.side}`}
                          row={row}
                          log={log}
                          editable={editable}
                          recorded={isRecorded(row)}
                          onChange={onChange}
                        />
                      ))}
                      {editable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-self-start"
                          onPress={() =>
                            onChange({
                              ...log,
                              extraRounds: {...log.extraRounds, [exercise.id]: (log.extraRounds[exercise.id] ?? 0) + 1},
                            })
                          }
                        >
                          <Plus />
                          Add set
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ul className="mt-2 grid gap-1 text-sm tabular-nums">
                      {rows.map((row) => (
                        <li key={`${row.round}-${row.side}`}>
                          Set {row.round}
                          {row.side ? ` ${row.side}` : ''}: {targetLine(row.target, exercise.metrics)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-[30rem] gap-2">
          {!log &&
            (coach ? (
              <p className="font-semibold">{coach} records this session.</p>
            ) : canStart ? (
              <Button onPress={onStart}>Start {workout.name}</Button>
            ) : (
              <p className="font-semibold">You can start this on the day.</p>
            ))}
          {log && editable && (
            <>
              {workout.type === 'prescribed' && (
                <p className="text-sm font-semibold tabular-nums">
                  {plannedRows.length - unticked.length} of {plannedRows.length} planned sets recorded
                </p>
              )}
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Button
                  variant="ghost"
                  onPress={() => setConfirm('discard')}
                >
                  Discard
                </Button>
                <Button onPress={() => setFinishing(true)}>
                  {workout.type === 'prescribed' ? 'Finish workout' : 'Mark as done'}
                </Button>
              </div>
            </>
          )}
          {log?.state === 'completed' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                onPress={() => setConfirm('delete')}
              >
                Delete workout
              </Button>
              <Button
                variant="outline"
                onPress={() => onChange({...log, state: 'active'})}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </footer>

      {swapping && log && (
        <BottomSheet
          title={`Swap ${(log.swaps[swapping.exercise.id] ?? swapping.exercise).name}`}
          onClose={() => setSwapping(null)}
        >
          <p className="mb-3 text-muted-foreground">Your coach sees what you did instead.</p>
          <ul className="grid gap-1">
            {[{name: swapping.exercise.name, metrics: swapping.exercise.metrics}, ...exerciseChoices].map((choice) => (
              <li key={choice.name}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onPress={() =>
                    log.sets.some((set) => set.exerciseId === swapping.exercise.id)
                      ? setSwapping({...swapping, to: choice})
                      : swap(swapping.exercise, choice)
                  }
                >
                  {choice.name === swapping.exercise.name ? `${choice.name} (as planned)` : choice.name}
                </Button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
      {swapping?.to && log && (
        <Confirm
          title={`Swap to ${swapping.to.name}?`}
          action="Swap and clear sets"
          cancel="Cancel"
          destructive
          pending={false}
          onConfirm={() => swapping.to && swap(swapping.exercise, swapping.to)}
          onClose={() => setSwapping(null)}
        >
          The {log.sets.filter((set) => set.exerciseId === swapping.exercise.id).length} sets you recorded for{' '}
          {swapping.exercise.name} are cleared, because {swapping.to.name} records different values.
        </Confirm>
      )}
      {finishing && log && (
        <FinishSheet
          log={log}
          unticked={unticked.length}
          onClose={() => setFinishing(false)}
          onSave={(feedback, recordRest) => {
            // "Record them as planned" records each unticked planned set with its typed or target values.
            const added = recordRest
              ? unticked.flatMap((row) => {
                  const values = numbersOf(log, row);
                  return Object.keys(values).length > 0
                    ? [actions.newSet(row.exercise, row.done.name, row.round, row.side, values)]
                    : [];
                })
              : [];
            onFinish({...log, ...feedback, sets: [...log.sets, ...added], inputs: {}, state: 'completed'});
          }}
        />
      )}
      {confirm === 'discard' && log && (
        <Confirm
          title={`Discard ${workout.name}?`}
          action="Discard workout"
          cancel="Keep going"
          destructive
          pending={false}
          onConfirm={() => onDiscard(log)}
          onClose={() => setConfirm(null)}
        >
          The {log.sets.length} sets you recorded are removed. The workout stays on the plan.
        </Confirm>
      )}
      {confirm === 'delete' && log && (
        <Confirm
          title={`Delete ${workout.name}?`}
          action="Delete workout"
          cancel="Cancel"
          destructive
          pending={false}
          onConfirm={() => onDelete(log)}
          onClose={() => setConfirm(null)}
        >
          Its {log.sets.length} sets and your feedback are removed. The day shows it as not recorded.
        </Confirm>
      )}
    </main>
  );
}

function SetRow({
  row,
  log,
  editable,
  recorded,
  onChange,
}: {
  row: Row;
  log: WorkoutLog;
  editable: boolean;
  recorded: boolean;
  onChange: (log: WorkoutLog) => void;
}) {
  const key = rowKey(row.exercise.id, row.round, row.side);
  const label = `${row.round}${row.side ? ` ${row.side}` : ''}`;
  const values = numbersOf(log, row);
  const ready = Object.keys(values).length > 0;
  const others = log.sets.filter(
    (s) => !(s.exerciseId === row.exercise.id && s.round === row.round && s.side === row.side),
  );

  const type = (metric: Metric, input: string) => {
    const inputs = {...log.inputs, [key]: {...log.inputs[key], [metric]: input}};
    const next = {...log, inputs};
    if (recorded) {
      const typed = numbersOf(next, row);
      // A recorded set follows its edits; clearing every value unticks it.
      next.sets =
        Object.keys(typed).length > 0
          ? [...others, actions.newSet(row.exercise, row.done.name, row.round, row.side, typed)]
          : others;
    }
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={`Set ${label}`}
      className={cn(
        'grid grid-cols-[4.5rem_1fr_3rem] items-start gap-2 rounded-xl px-1 py-1',
        recorded && 'bg-[var(--progress)]',
      )}
    >
      <span className="pt-1">
        <span className="block font-semibold tabular-nums">
          {label}
          {row.extra ? ' · extra' : ''}
        </span>
        {/* The target stays visible while the client types (it is never only a placeholder). */}
        <span className="block text-sm text-muted-foreground tabular-nums">
          {targetLine(row.target, row.done.metrics)}
        </span>
      </span>
      <span
        className="grid gap-2"
        style={{gridTemplateColumns: `repeat(${row.done.metrics.length}, minmax(0, 1fr))`}}
      >
        {row.done.metrics.map((metric) => (
          <Field
            key={metric}
            label={`${row.done.name} set ${label} ${metricLabel[metric]}`}
            hideLabel
            inputMode="decimal"
            value={inputOf(log, row, metric)}
            onChange={(input) => type(metric, input)}
            isDisabled={!editable}
            inputClassName="text-center tabular-nums"
          />
        ))}
      </span>
      <Button
        size="icon"
        variant={recorded ? 'default' : 'outline'}
        aria-label={
          recorded ? `Set ${label} of ${row.done.name} recorded. Untick` : `Record set ${label} of ${row.done.name}`
        }
        aria-pressed={recorded}
        isDisabled={!editable || (!recorded && !ready)}
        onPress={() =>
          onChange({
            ...log,
            sets: recorded
              ? others
              : [...others, actions.newSet(row.exercise, row.done.name, row.round, row.side, values)],
          })
        }
      >
        <Check />
      </Button>
    </div>
  );
}

function FinishSheet({
  log,
  unticked,
  onSave,
  onClose,
}: {
  log: WorkoutLog;
  unticked: number;
  onSave: (feedback: Pick<WorkoutLog, 'difficulty' | 'pain' | 'painNote'>, recordRest: boolean) => void;
  onClose: () => void;
}) {
  const [rest, setRest] = useState<'record' | 'skip'>();
  const [difficulty, setDifficulty] = useState<WorkoutLog['difficulty']>(log.difficulty);
  const [pain, setPain] = useState<'no' | 'yes' | undefined>(
    log.pain === undefined ? undefined : log.pain ? 'yes' : 'no',
  );
  const [note, setNote] = useState(log.painNote ?? '');
  const missing = [
    unticked > 0 && !rest ? 'the unticked sets' : null,
    !difficulty ? 'how hard it was' : null,
    !pain ? 'whether anything hurt' : null,
  ].filter(Boolean);
  return (
    <BottomSheet
      title="Finish workout"
      onClose={onClose}
    >
      <div className="grid gap-5">
        {unticked > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-semibold">
              {unticked} planned {unticked === 1 ? 'set is' : 'sets are'} not ticked
            </legend>
            <Choice
              label="Unticked sets"
              value={rest}
              options={[
                {value: 'record', label: 'Record them as planned'},
                {value: 'skip', label: 'Finish without them'},
              ]}
              onChange={setRest}
            />
          </fieldset>
        )}
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">How hard was it?</legend>
          <Choice
            label="How hard was it?"
            value={difficulty}
            options={(['too_easy', 'just_right', 'too_hard'] as const).map((value) => ({
              value,
              label: difficultyLabel[value],
            }))}
            onChange={setDifficulty}
          />
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">Did anything hurt?</legend>
          <Choice
            label="Did anything hurt?"
            value={pain}
            options={[
              {value: 'no', label: 'No'},
              {value: 'yes', label: 'Yes'},
            ]}
            onChange={setPain}
          />
        </fieldset>
        {pain === 'yes' && (
          <Field
            label="Where, and when? (optional)"
            value={note}
            onChange={setNote}
          />
        )}
        {missing.length > 0 && <p className="text-sm text-muted-foreground">Answer {missing.join(', ')} to save.</p>}
        <Button
          isDisabled={missing.length > 0}
          onPress={() => {
            if (difficulty && pain) {
              onSave(
                {difficulty, pain: pain === 'yes', painNote: pain === 'yes' ? note.trim() : ''},
                rest === 'record',
              );
            }
          }}
        >
          Save workout
        </Button>
      </div>
    </BottomSheet>
  );
}
