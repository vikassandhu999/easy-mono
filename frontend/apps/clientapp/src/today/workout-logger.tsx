import {Check, Plus, Repeat} from 'lucide-react';
import {useLayoutEffect, useRef, useState} from 'react';
import {useExercises} from '../api/exercises';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Confirm} from '../ui/confirm';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {
  actions,
  type DoneExercise,
  dayLabel,
  difficultyLabel,
  type Metric,
  metricLabel,
  metricValue,
  rowKey,
  type SetLog,
  type Target,
  targetText,
  type Workout,
  type WorkoutExercise,
  type WorkoutLog,
  workoutInput,
} from './model';
import {Choice, Field, ScreenHeader, useFocusOnMount} from './parts';

type Row = {
  exercise: WorkoutExercise;
  done: DoneExercise;
  round: number;
  side: SetLog['side'];
  extra: boolean;
  target: Target;
  rest: string;
};

// Every row of an exercise: planned rounds, rounds the client added, and any recorded beyond them.
function rowsOf(log: WorkoutLog | null, exercise: WorkoutExercise, rounds: number): Row[] {
  const done = log?.swaps[exercise.id] ?? exercise.original;
  const recorded = Math.max(
    0,
    ...(log?.sets ?? []).filter((set) => set.exerciseId === exercise.id).map((set) => set.round),
  );
  const total = Math.max(rounds + (log?.extraRounds[exercise.id] ?? 0), recorded);
  const rows: Row[] = [];
  for (let round = 1; round <= total; round++) {
    const target = exercise.targets[Math.min(round, exercise.targets.length) - 1] ?? {};
    for (const side of done.unilateral ? (['L', 'R'] as const) : [null]) {
      rows.push({
        exercise,
        done,
        round,
        side,
        extra: round > rounds,
        target,
        rest: exercise.restByRound[Math.min(round, exercise.restByRound.length) - 1] ?? '',
      });
    }
  }
  return rows;
}

const targetLine = (target: Target, metrics: Metric[]) =>
  metrics
    .map((metric) => targetText(target, metric))
    .filter((text) => text !== 'any')
    .join(' · ') || 'your choice';

const inputOf = (log: WorkoutLog, row: Row, metric: Metric) =>
  workoutInput(log, row.exercise.id, row.round, row.side, row.target, metric);

const numbersOf = (log: WorkoutLog, row: Row): SetLog['values'] =>
  Object.fromEntries(
    row.done.metrics.flatMap<[string, number | string]>((metric) => {
      const value = metricValue(inputOf(log, row, metric), metric, row.done);
      return value === null ? [] : [[metric, value]];
    }),
  );
const invalidRow = (log: WorkoutLog, row: Row) =>
  row.done.metrics.some(
    (metric) =>
      inputOf(log, row, metric).trim() !== '' && metricValue(inputOf(log, row, metric), metric, row.done) === null,
  );

export function WorkoutLogger({
  workout,
  log,
  date,
  time,
  coach,
  back,
  canStart,
  readOnly,
  startBlockedReason,
  pending,
  locked,
  blocked,
  error,
  draftStatus,
  onRetry,
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
  readOnly: boolean;
  startBlockedReason: string;
  pending: boolean;
  locked: boolean;
  blocked: boolean;
  error: string;
  draftStatus: React.ReactNode;
  onRetry: () => void;
  onStart: () => void;
  onChange: (log: WorkoutLog) => void;
  onFinish: (log: WorkoutLog) => void;
  onDiscard: (log: WorkoutLog) => void;
  onDelete: (log: WorkoutLog) => void;
  onClose: () => void;
}) {
  const heading = useFocusOnMount();
  const footer = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  useLayoutEffect(() => {
    const element = footer.current;
    if (!element) {
      return;
    }
    const measure = () => setFooterHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [swapping, setSwapping] = useState<{exercise: WorkoutExercise; to?: DoneExercise} | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const editable = log?.state === 'active' && !readOnly;
  const allRows = workout.groups.flatMap((group) =>
    group.exercises.flatMap((exercise) => rowsOf(log, exercise, group.rounds)),
  );
  const plannedRows = allRows.filter((row) => !row.extra);
  const isRecorded = (row: Row) =>
    Boolean(log?.sets.some((s) => s.exerciseId === row.exercise.id && s.round === row.round && s.side === row.side));
  const unticked = log ? plannedRows.filter((row) => !isRecorded(row)) : [];
  const invalid = Boolean(log && allRows.some((row) => invalidRow(log, row)));
  const state = !log ? 'Not started' : log.state === 'completed' ? 'Done' : 'In progress · sets save as you tick them';

  const closeSwap = (exerciseId: string) => {
    setSwapping(null);
    requestAnimationFrame(() => {
      document.getElementById(`swap-${exerciseId}`)?.focus({preventScroll: true});
    });
  };
  const swap = (exercise: WorkoutExercise, to: DoneExercise) => {
    if (!log) {
      return;
    }
    const swaps = {...log.swaps};
    if (to.id === exercise.exerciseId) {
      delete swaps[exercise.id];
    } else {
      swaps[exercise.id] = to;
    }
    // Recorded values belong to the old exercise's metrics.
    const sets = log.sets.filter((set) => set.exerciseId !== exercise.id);
    onChange({
      ...log,
      swaps,
      sets,
      inputs: Object.fromEntries(Object.entries(log.inputs).filter(([key]) => !key.startsWith(`${exercise.id}:`))),
    });
    closeSwap(exercise.id);
  };

  return (
    <main
      className="page"
      style={{paddingBottom: footerHeight + 24}}
    >
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
        <div className="mb-5">
          {workout.video && /\.(mp4|webm|mov)(?:\?|$)/i.test(workout.video) ? (
            <video
              className="aspect-video w-full rounded-2xl bg-foreground"
              src={workout.video}
              controls
              aria-label={workout.name}
            >
              <track kind="captions" />
            </video>
          ) : workout.video ? (
            <a
              className="inline-flex min-h-12 items-center font-semibold underline"
              href={workout.video}
              target="_blank"
              rel="noreferrer"
            >
              Open workout video (opens a new tab)
            </a>
          ) : (
            <p className="text-muted-foreground">No video is available.</p>
          )}
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
              const done = rows[0]?.done ?? exercise.original;
              const swapped = done.id !== exercise.exerciseId;
              const repeated = workout.groups
                .flatMap((group) => group.exercises)
                .some(
                  (other) => other.id !== exercise.id && (log?.swaps[other.id] ?? other.original).name === done.name,
                );
              const accessibleName = repeated ? `${done.name} (${exercise.code})` : done.name;
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
                        {done.unilateral ? 'Each side · ' : ''}
                        {exercise.rest}
                      </p>
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        id={`swap-${exercise.id}`}
                        aria-label={`Swap ${accessibleName}`}
                        isDisabled={locked}
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
                      aria-label={`Sets for ${accessibleName}`}
                      className="mt-3 grid gap-2"
                    >
                      <div
                        aria-hidden="true"
                        className="grid grid-cols-[4.5rem_1fr_3rem] gap-2 text-sm font-semibold text-muted-foreground"
                      >
                        <span>Set</span>
                        <span
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: `repeat(${done.metrics.length > 3 ? 2 : done.metrics.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {done.metrics.map((metric) => (
                            <span key={metric}>{metricLabel[metric]}</span>
                          ))}
                        </span>
                      </div>
                      {rows.map((row) => (
                        <SetRow
                          key={`${exercise.id}-${done.id}-${row.round}-${row.side}`}
                          row={row}
                          accessibleName={accessibleName}
                          log={log}
                          editable={editable && !locked}
                          pending={pending}
                          recorded={isRecorded(row)}
                          onChange={onChange}
                        />
                      ))}
                      {editable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-self-start"
                          aria-label={`Add set of ${accessibleName}`}
                          isDisabled={locked}
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
                          {row.rest ? ` · ${row.rest}` : ''}
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

      {draftStatus}
      <footer
        ref={footer}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto grid max-w-[30rem] gap-2">
          {(error || blocked) && (
            <div className="grid gap-2">
              {error && (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}
              {blocked && (
                <Button
                  variant="outline"
                  isPending={pending}
                  isDisabled={invalid}
                  onPress={onRetry}
                >
                  Retry saving sets
                </Button>
              )}
            </div>
          )}
          {!log &&
            (coach ? (
              <p className="font-semibold">{coach} records this session.</p>
            ) : canStart ? (
              <Button
                isPending={pending}
                onPress={onStart}
              >
                Start {workout.name}
              </Button>
            ) : (
              <p className="font-semibold">{startBlockedReason}</p>
            ))}
          {invalid && <p className="text-sm font-medium text-destructive">Correct set values before finishing.</p>}
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
                  isDisabled={locked}
                  onPress={() => setConfirm('discard')}
                >
                  Discard
                </Button>
                <Button
                  isDisabled={pending || blocked || invalid}
                  onPress={() => setFinishing(true)}
                >
                  {workout.type === 'prescribed' ? 'Finish workout' : 'Mark as done'}
                </Button>
              </div>
            </>
          )}
          {log?.state === 'completed' && !readOnly && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                isDisabled={locked}
                onPress={() => setConfirm('delete')}
              >
                Delete workout
              </Button>
              <Button
                variant="outline"
                isDisabled={locked}
                onPress={() => onChange({...log, state: 'active'})}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </footer>

      {swapping && !swapping.to && log && (
        <BottomSheet
          title={`Swap ${(log.swaps[swapping.exercise.id] ?? swapping.exercise).name}`}
          onClose={() => closeSwap(swapping.exercise.id)}
        >
          <p className="mb-3 text-muted-foreground">Your coach sees what you did instead.</p>
          <ExerciseChoices
            original={swapping.exercise.original}
            onPick={(choice) =>
              log.sets.some((set) => set.exerciseId === swapping.exercise.id)
                ? setSwapping({...swapping, to: choice})
                : swap(swapping.exercise, choice)
            }
          />
        </BottomSheet>
      )}
      {swapping?.to && log && (
        <Confirm
          title={`Swap to ${swapping.to.name}?`}
          action="Swap and clear sets"
          cancel="Cancel"
          destructive
          pending={pending}
          onConfirm={() => swapping.to && swap(swapping.exercise, swapping.to)}
          onClose={() => closeSwap(swapping.exercise.id)}
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
          pending={pending}
          error={error}
          onSave={(feedback, recordRest) => {
            // "Record them as planned" records each unticked planned set with its typed or target values.
            const added = recordRest
              ? unticked.flatMap((row) => {
                  const values = numbersOf(log, row);
                  return Object.keys(values).length > 0
                    ? [actions.newSet(row.exercise, row.done, row.round, row.side, values)]
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
          pending={pending}
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
          pending={pending}
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
  accessibleName,
  log,
  editable,
  pending,
  recorded,
  onChange,
}: {
  row: Row;
  accessibleName: string;
  log: WorkoutLog;
  editable: boolean;
  pending: boolean;
  recorded: boolean;
  onChange: (log: WorkoutLog) => void;
}) {
  const key = rowKey(row.exercise.id, row.round, row.side);
  const label = `${row.round}${row.side ? ` ${row.side}` : ''}`;
  const values = numbersOf(log, row);
  const ready = Object.keys(values).length > 0 && !invalidRow(log, row);
  const others = log.sets.filter(
    (s) => !(s.exerciseId === row.exercise.id && s.round === row.round && s.side === row.side),
  );

  const type = (metric: Metric, input: string) => {
    const inputs = {...log.inputs, [key]: {...log.inputs[key], [metric]: input}};
    const next = {...log, inputs};
    if (recorded && !invalidRow(next, row)) {
      const typed = numbersOf(next, row);
      // A recorded set follows its edits; clearing every value unticks it.
      next.sets =
        Object.keys(typed).length > 0
          ? [
              ...others,
              {
                ...(log.sets.find(
                  (set) => set.exerciseId === row.exercise.id && set.round === row.round && set.side === row.side,
                ) ?? actions.newSet(row.exercise, row.done, row.round, row.side, typed)),
                values: typed,
              },
            ]
          : others;
    }
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={`${accessibleName} set ${label}`}
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
          {row.rest ? ` · ${row.rest}` : ''}
        </span>
      </span>
      <span
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${row.done.metrics.length > 3 ? 2 : row.done.metrics.length}, minmax(0, 1fr))`,
        }}
      >
        {row.done.metrics.map((metric) =>
          metric === 'result' || metric === 'grade' ? (
            <SelectField
              key={metric}
              aria-label={`${accessibleName} set ${label} ${metricLabel[metric]}`}
              value={inputOf(log, row, metric)}
              isDisabled={!editable}
              onChange={(input) => type(metric, input)}
            >
              <SelectItem id="">Choose</SelectItem>
              {(metric === 'result' ? ['win', 'draw', 'loss'] : row.done.grade_scale).map((value) => (
                <SelectItem
                  key={value}
                  id={value}
                >
                  {value}
                </SelectItem>
              ))}
            </SelectField>
          ) : (
            <Field
              key={metric}
              label={`${accessibleName} set ${label} ${metricLabel[metric] ?? metric}`}
              hideLabel
              inputMode="decimal"
              error={
                inputOf(log, row, metric).trim() !== '' &&
                metricValue(inputOf(log, row, metric), metric, row.done) === null
                  ? `Enter a valid ${metricLabel[metric] ?? metric} value.`
                  : null
              }
              value={inputOf(log, row, metric)}
              onChange={(input) => type(metric, input)}
              isDisabled={!editable}
              inputClassName="text-center tabular-nums"
            />
          ),
        )}
      </span>
      <Button
        size="icon"
        variant={recorded ? 'default' : 'outline'}
        aria-label={
          recorded ? `Set ${label} of ${accessibleName} recorded. Untick` : `Record set ${label} of ${accessibleName}`
        }
        aria-pressed={recorded}
        isDisabled={!editable || pending || (!recorded && !ready)}
        onPress={() =>
          onChange({
            ...log,
            sets: recorded ? others : [...others, actions.newSet(row.exercise, row.done, row.round, row.side, values)],
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
  pending,
  error,
}: {
  pending: boolean;
  error: string;
  log: WorkoutLog;
  unticked: number;
  onSave: (feedback: Pick<WorkoutLog, 'difficulty' | 'pain' | 'painNote'>, recordRest: boolean) => void;
  onClose: () => void;
}) {
  const [rest, setRest] = useState<'record' | 'skip'>();
  const [difficulty, setDifficulty] = useState<WorkoutLog['difficulty']>(log.difficulty);
  const [pain, setPain] = useState<'no' | 'yes' | undefined>(log.pain === null ? undefined : log.pain ? 'yes' : 'no');
  const [note, setNote] = useState(log.painNote ?? '');
  const missing = [
    unticked > 0 && !rest ? 'the unticked sets' : null,
    !difficulty ? 'how hard it was' : null,
    !pain ? 'whether anything hurt' : null,
  ].filter(Boolean);
  return (
    <BottomSheet
      title="Finish workout"
      pending={pending}
      onClose={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <fieldset
        disabled={pending}
        className="grid gap-5"
      >
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
            value={difficulty ?? undefined}
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
        {error && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error} Try Save workout again.
          </p>
        )}
        <Button
          isPending={pending}
          isDisabled={missing.length > 0 || pending}
          onPress={() => {
            if (!pending && difficulty && pain) {
              onSave(
                {difficulty, pain: pain === 'yes', painNote: pain === 'yes' ? note.trim() : ''},
                rest === 'record',
              );
            }
          }}
        >
          Save workout
        </Button>
      </fieldset>
    </BottomSheet>
  );
}
function ExerciseChoices({original, onPick}: {original: DoneExercise; onPick: (choice: DoneExercise) => void}) {
  const [search, setSearch] = useState('');
  const query = useExercises(search);
  const choices = [original, ...(query.data?.data ?? []).filter((row) => row.id !== original.id)];
  return (
    <>
      <Field
        label="Search exercises"
        type="search"
        value={search}
        onChange={setSearch}
        autoFocus
      />
      {!query.data ? (
        <ReadState
          label="exercises"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
      ) : (
        <ul className="mt-3 grid gap-1">
          {choices.map((choice, index) => {
            const duplicates = choices.filter((row) => row.name === choice.name);
            const source = choice.is_builtin ? 'Built-in' : "Coach's exercise";
            const repeatedSource = duplicates.filter((row) => row.is_builtin === choice.is_builtin).length > 1;
            const suffix =
              choice.id === original.id
                ? ' (as planned)'
                : duplicates.length > 1
                  ? ` · ${source}${repeatedSource ? ` (choice ${index + 1})` : ''}`
                  : '';
            return (
              <li key={choice.id}>
                <Button
                  variant="ghost"
                  className="h-auto min-h-12 w-full flex-col items-start whitespace-normal text-left"
                  onPress={() => onPick(choice)}
                >
                  <span>
                    {choice.name}
                    {suffix}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {choice.unilateral ? 'Each side · ' : ''}
                    {choice.metrics.map((metric) => metricLabel[metric] ?? metric).join(' · ')}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
