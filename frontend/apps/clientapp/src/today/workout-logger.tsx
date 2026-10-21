import {measurementFields, parseMeasurement} from '@easy/workouts/measurements';
import {type MetricKey, metricKeys, metricLabel} from '@easy/workouts/metrics';
import {mismatch, type RecordingRow, rowsFor, type Slot} from '@easy/workouts/recording';
import {
  columnLabel,
  effortLabel,
  effortLabels,
  feedbackBody,
  hasOverallResult,
  hasRecordedWork,
  inputLabel,
  type MeasurementBody,
  type MetricInputs,
  measurementBody,
  overallInputKey,
  planDraft,
  plural,
  restModes,
  roundsFor,
  savedInput,
  selectedActivity,
  slotModel,
  targetLine,
  targetSummary,
  unrecordedCount,
  type WorkoutDraft,
} from '@easy/workouts/session';
import {targetPlaceholder} from '@easy/workouts/targets';
import {Check, Repeat} from 'lucide-react';
import {type ReactNode, useEffect, useId, useRef, useState} from 'react';
import {type Exercise, useExercises} from '../api/exercises';
import type {ExerciseLog, ExerciseLogUpdate, ExerciseSet, WorkoutLog, WorkoutLogFeedback} from '../api/workout-logs';
import type {Workout, WorkoutExercise} from '../api/workouts';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Confirm} from '../ui/confirm';
import {Label} from '../ui/label';
import {ReadState} from '../ui/read-state';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {dayLabel} from './model';
import {Choice, Field, ScreenHeader, useFocusOnMount} from './parts';

type WorkoutRow = RecordingRow<WorkoutExercise, ExerciseLog>;

type Props = {
  workout: Workout;
  log: WorkoutLog | null;
  date: string;
  time: string | null;
  back: string;
  readOnly: boolean;
  canStart: boolean;
  startBlockedReason: string;
  pending: boolean;
  blocked: boolean;
  draft: WorkoutDraft;
  error: string;
  draftStatus: ReactNode;
  onClose: () => void;
  onInput: (key: string, metric: MetricKey, value: string) => void;
  onRetry: () => void;
  onStart: () => void;
  onSaveSlot: (row: WorkoutRow, slot: Slot, state: 'completed' | 'skipped', body: MeasurementBody, key: string) => void;
  onSaveOverall: (row: WorkoutRow, body: MeasurementBody, key: string) => void;
  onSavePlan: (row: WorkoutRow, body: ExerciseLogUpdate) => void;
  onCopyTargets: (row: WorkoutRow) => void;
  onSwap: (row: WorkoutRow, exerciseId: string) => void;
  onAddActivity: (exerciseId: string) => void;
  onRemoveSet: (activityId: string, setId: string) => void;
  onActivityOutcome: (row: WorkoutRow, action: 'completeActivity' | 'skipActivity' | 'reopenActivity') => void;
  onFinish: (body: WorkoutLogFeedback) => void;
  onReopen: () => void;
  onDiscard: () => void;
};

export function WorkoutLogger(props: Props) {
  const {workout, log, pending, blocked} = props;
  const draft = log?.state === 'active' ? props.draft : {...props.draft, inputs: {}};
  const heading = useFocusOnMount();
  const [swap, setSwap] = useState<WorkoutRow | 'add' | null>(null);
  const [plan, setPlan] = useState<WorkoutRow | null>(null);
  const [finish, setFinish] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState<{activityId: string; setId: string} | null>(null);
  const editable = log?.state === 'active' && !props.readOnly;
  const locked = pending || blocked;
  const rows = rowsFor(workout, log ?? {exercise_logs: []});
  return (
    <main className="page pb-36">
      <ScreenHeader
        title={workout.name}
        headingRef={heading}
        back={props.back}
        onBack={props.onClose}
        subtitle={`${dayLabel(props.date)}${props.time ? ` · planned ${props.time}` : ''} · ${!log ? 'Not started' : log.state === 'completed' ? 'Completed' : log.state === 'discarded' ? 'Discarded' : 'In progress'}`}
      />
      {(pending || props.error || blocked || props.draftStatus) && (
        <div
          role="region"
          aria-label="Workout save status"
          className="sticky top-[env(safe-area-inset-top)] z-30 grid gap-2 border-b border-border bg-background py-3"
        >
          {pending ? <p role="status">Saving…</p> : props.draftStatus}
          {props.error && (
            <p
              role="alert"
              className="font-medium text-destructive"
            >
              {props.error}
            </p>
          )}
          {blocked && (
            <>
              {!props.error && (
                <p
                  role="status"
                  className="font-medium"
                >
                  An action is kept on this device. Retry saving before another change.
                </p>
              )}
              <Button
                variant="outline"
                isPending={pending}
                onPress={props.onRetry}
              >
                Retry saving
              </Button>
            </>
          )}
        </div>
      )}
      {workout.description && (
        <p className="mb-5 rounded-2xl bg-[var(--coach)] p-4 font-medium">{workout.description}</p>
      )}
      {workout.video && (
        <a
          className="mb-4 inline-flex min-h-12 items-center font-semibold underline"
          href={workout.video.url}
          target="_blank"
          rel="noreferrer"
        >
          Open workout video (opens a new tab)
        </a>
      )}
      {log?.recorded_by === 'coach' && (
        <p
          role="status"
          className="mb-4 rounded-2xl bg-muted p-4 font-semibold"
        >
          {log.state === 'active'
            ? `${log.recorder_name} is recording this session`
            : `Recorded by ${log.recorder_name}`}
        </p>
      )}
      {log?.state === 'completed' && (
        <p className="mb-4 font-semibold">
          {effortLabel(log.effort)}
          {log.pain === null ? '' : log.pain ? ' · Pain or discomfort reported' : ' · No pain or discomfort'}
          {log.text && <span className="mt-2 block whitespace-pre-wrap font-medium">{log.text}</span>}
        </p>
      )}
      <div className="grid gap-5">
        {rows.map((row) => {
          const selected = selectedActivity(row);
          const exercise = selected?.exercise ?? row.entry?.exercise;
          if (!exercise) {
            return null;
          }
          const sourceId = row.entry?.id ?? selected?.id ?? '';
          const targets = selected?.targets ?? row.entry?.targets ?? [];
          const targetMode = selected?.targets_mode ?? row.entry?.targets_mode ?? 'same_for_all';
          const overallKey = overallInputKey(sourceId, exercise.id);
          const overallInputs = draft.inputs[overallKey] ?? {};
          const overall = measurementBody(exercise, overallInputs, 'overall', true);
          const warning = selected ? mismatch(selected) : null;
          const activitySkipped = selected?.state === 'skipped';
          const swapped = Boolean(row.entry && exercise.id !== row.entry.exercise_id);
          const summary = targetSummary(exercise, targets, targetMode);
          const hasOverall = Boolean(selected && hasOverallResult(selected));
          return (
            <section
              key={sourceId}
              aria-label={`Activity ${exercise.name}`}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{exercise.name}</h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {swapped && row.entry ? `Instead of ${row.entry.exercise.name} · ` : ''}
                    {row.slots.some((slot) => slot.side !== null) ? 'Each side · ' : ''}
                    {plural(roundsFor(workout, row), 'round')}
                    {activitySkipped
                      ? ' · Activity skipped'
                      : selected?.state === 'completed'
                        ? ' · Activity completed'
                        : ''}
                  </p>
                  {summary && <p className="text-sm font-medium text-muted-foreground">Target: {summary}</p>}
                </div>
                {editable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Swap ${exercise.name}`}
                    isDisabled={locked}
                    onPress={() => setSwap(row)}
                  >
                    <Repeat />
                    Swap
                  </Button>
                )}
              </div>
              {!log ? (
                <ul className="grid gap-2 text-sm font-medium">
                  {row.slots.map((slot) => (
                    <li key={`${slot.round}.${slot.side}`}>
                      Set {slot.round}
                      {slot.side ? ` ${slot.side}` : ''}:{' '}
                      {targetLine(exercise, targets[targetMode === 'same_for_all' ? 0 : slot.round - 1])}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <SetTableHeader exercise={exercise} />
                  <div className="grid gap-1.5">
                    {row.slots.map((slot) => (
                      <SlotRow
                        key={`${slot.round}.${slot.side}`}
                        row={row}
                        slot={slot}
                        log={log}
                        fallback={exercise}
                        draft={draft}
                        perRound={summary === null}
                        editable={editable && !activitySkipped}
                        locked={locked}
                        onInput={props.onInput}
                        onSave={props.onSaveSlot}
                        onClear={(activityId, setId) => setRemove({activityId, setId})}
                        onUndoSkip={props.onRemoveSet}
                      />
                    ))}
                  </div>
                  <details
                    open={hasOverall || (exercise.kind === 'activity' && !row.slots.length)}
                    className="mt-4 border-t border-border pt-3"
                  >
                    <summary className="min-h-11 cursor-pointer py-2 font-bold">Overall result</summary>
                    <fieldset
                      aria-label={`Overall result for ${exercise.name}`}
                      className="mt-2 grid gap-3"
                    >
                      <MeasurementInputs
                        exercise={exercise}
                        scope="overall"
                        row={selected ?? null}
                        inputs={overallInputs}
                        prefix={`${exercise.name} overall`}
                        disabled={!editable || activitySkipped || locked}
                        onInput={(metric, value) => props.onInput(overallKey, metric, value)}
                      />
                      {warning && (
                        <p
                          role="status"
                          className="text-sm font-medium text-muted-foreground"
                        >
                          {warning}
                        </p>
                      )}
                      {editable && !activitySkipped && Object.keys(overallInputs).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="justify-self-start"
                          isDisabled={locked || !overall.ok}
                          onPress={() => {
                            if (overall.ok) {
                              props.onSaveOverall(row, overall.body, overallKey);
                            }
                          }}
                        >
                          Save overall result
                        </Button>
                      )}
                    </fieldset>
                  </details>
                  {editable && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={locked}
                        onPress={() => setPlan(row)}
                      >
                        Edit plan
                      </Button>
                      {selected && swapped && (
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={locked || activitySkipped}
                          onPress={() => props.onCopyTargets(row)}
                        >
                          Copy original targets
                        </Button>
                      )}
                      {selected?.state === 'completed' || activitySkipped ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={locked}
                          onPress={() => props.onActivityOutcome(row, 'reopenActivity')}
                        >
                          Reopen activity
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            isDisabled={locked}
                            onPress={() => props.onActivityOutcome(row, 'completeActivity')}
                          >
                            Complete activity
                          </Button>
                          {!hasRecordedWork(selected) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled={locked}
                              onPress={() => props.onActivityOutcome(row, 'skipActivity')}
                            >
                              Skip activity
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
      {editable && (
        <Button
          className="mt-4"
          variant="outline"
          isDisabled={locked}
          onPress={() => setSwap('add')}
        >
          Add activity
        </Button>
      )}
      <footer className="mt-6 grid gap-3 rounded-2xl border-t border-border bg-background py-4">
        {!log &&
          (props.canStart ? (
            <Button
              isPending={pending}
              isDisabled={blocked}
              onPress={props.onStart}
            >
              Start {workout.name}
            </Button>
          ) : (
            <p className="font-medium">{props.startBlockedReason}</p>
          ))}
        {editable && (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button
              variant="ghost"
              isDisabled={locked}
              onPress={() => setDiscard(true)}
            >
              Discard
            </Button>
            <Button
              isDisabled={locked}
              onPress={() => setFinish(true)}
            >
              Finish workout
            </Button>
          </div>
        )}
        {log?.state === 'completed' && !props.readOnly && (
          <Button
            variant="outline"
            isDisabled={locked}
            onPress={props.onReopen}
          >
            Reopen
          </Button>
        )}
      </footer>
      {swap && (
        <BottomSheet
          title={
            swap === 'add'
              ? 'Add activity'
              : `Swap ${selectedActivity(swap)?.exercise.name ?? swap.entry?.exercise.name ?? ''}`
          }
          onClose={() => setSwap(null)}
        >
          <ExerciseChoices
            onPick={(choice) => {
              if (swap === 'add') {
                props.onAddActivity(choice.id);
              } else {
                props.onSwap(swap, choice.id);
              }
              setSwap(null);
            }}
          />
        </BottomSheet>
      )}
      {plan && (
        <PlanEditor
          row={plan}
          onClose={() => setPlan(null)}
          onSave={(body) => {
            props.onSavePlan(plan, body);
            setPlan(null);
          }}
        />
      )}
      {finish && log && (
        <FinishSheet
          log={log}
          unrecorded={unrecordedCount(log, rows)}
          pending={pending || blocked}
          error={props.error}
          onClose={() => setFinish(false)}
          onSave={props.onFinish}
        />
      )}
      {discard && (
        <Confirm
          title={`Discard ${workout.name}?`}
          action="Discard workout"
          cancel="Keep going"
          destructive
          pending={pending}
          onClose={() => setDiscard(false)}
          onConfirm={props.onDiscard}
        >
          The recorded results remain in your history. This workout will no longer be marked completed.
        </Confirm>
      )}
      {remove && (
        <Confirm
          title="Clear this set?"
          action="Clear set"
          cancel="Keep set"
          destructive
          pending={pending}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            props.onRemoveSet(remove.activityId, remove.setId);
            setRemove(null);
          }}
        >
          Its values are removed and the set shows as not recorded.
        </Confirm>
      )}
    </main>
  );
}

// The prototype's set table: one header for the metric names, then one short row per set.
const setGrid = 'grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2';
const metricColumns = (count: number) => ({gridTemplateColumns: `repeat(${Math.min(count, 3)}, minmax(0, 1fr))`});

function detailMetrics(exercise: Exercise) {
  return exercise.metrics.filter((metric) => measurementFields[metric.key]);
}

function SetTableHeader({exercise}: {exercise: Exercise}) {
  const metrics = detailMetrics(exercise);
  return (
    <div
      aria-hidden="true"
      className={`${setGrid} mb-1 px-2 text-sm font-semibold text-muted-foreground`}
    >
      <span>Set</span>
      <span
        className="grid gap-2"
        style={metricColumns(metrics.length)}
      >
        {metrics.map((metric) => (
          <span
            key={metric.key}
            className="truncate"
          >
            {columnLabel(metric)}
          </span>
        ))}
      </span>
      <span />
    </div>
  );
}

function SlotRow({
  row,
  slot,
  log,
  fallback,
  draft,
  perRound,
  editable,
  locked,
  onInput,
  onSave,
  onClear,
  onUndoSkip,
}: {
  row: WorkoutRow;
  slot: Slot;
  log: WorkoutLog;
  fallback: Exercise;
  draft: WorkoutDraft;
  perRound: boolean;
  editable: boolean;
  locked: boolean;
  onInput: Props['onInput'];
  onSave: Props['onSaveSlot'];
  onClear: Props['onRemoveSet'];
  onUndoSkip: Props['onRemoveSet'];
}) {
  const group = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current && !locked) {
      restoreFocus.current = false;
      group.current?.focus({preventScroll: true});
    }
  }, [locked]);
  const model = slotModel(log, row, slot, draft, fallback);
  if (!model) {
    return null;
  }
  const {view, exercise, key, inputs, body, label, name, target} = model;
  const dirty = Object.keys(inputs).length > 0;
  const short = `${slot.round}${slot.side ? ` ${slot.side === 'left' ? 'L' : 'R'}` : ''}`;
  const save = (state: 'completed' | 'skipped', values: MeasurementBody) => {
    if (!editable || locked) {
      return;
    }
    restoreFocus.current = true;
    onSave(row, slot, state, values, key);
  };
  const metrics = detailMetrics(exercise);
  return (
    <div
      ref={group}
      role="group"
      aria-label={name}
      tabIndex={-1}
      className={cn(
        'rounded-xl px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        view.kind === 'completed' && 'bg-[var(--progress)]',
        view.kind === 'skipped' && 'bg-muted text-muted-foreground',
      )}
    >
      <div className={setGrid}>
        <span className="font-bold tabular-nums">
          <span aria-hidden="true">{short}</span>
          <span className="sr-only">
            Set {label}: {view.kind === 'completed' ? 'Done' : view.kind === 'skipped' ? 'Skipped' : 'Unrecorded'}
          </span>
        </span>
        {view.kind === 'skipped' ? (
          <span className="justify-self-start rounded-full border border-dashed border-muted-foreground px-3 py-1 text-sm font-semibold">
            Skipped
          </span>
        ) : (
          <div
            className="grid gap-2"
            style={metricColumns(metrics.length)}
          >
            {metrics.map((metric) => {
              const value = inputs[metric.key] ?? savedInput(view.set, metric.key);
              const parsed = parseMeasurement(metric.key, value);
              return metric.key === 'result' ? (
                <SelectField
                  key={metric.key}
                  aria-label={`${name} ${inputLabel(metric)}`}
                  value={value}
                  isDisabled={!editable || locked}
                  onChange={(next) => onInput(key, metric.key, next)}
                >
                  <SelectItem id="">–</SelectItem>
                  <SelectItem id="win">Win</SelectItem>
                  <SelectItem id="draw">Draw</SelectItem>
                  <SelectItem id="loss">Loss</SelectItem>
                </SelectField>
              ) : (
                <Field
                  key={metric.key}
                  label={`${name} ${inputLabel(metric)}`}
                  hideLabel
                  value={value}
                  placeholder={targetPlaceholder(metric.key, target?.[metric.key])}
                  isDisabled={!editable || locked}
                  inputMode={metric.key === 'duration' ? 'text' : 'decimal'}
                  inputClassName="px-1 text-center font-bold tabular-nums placeholder:font-normal placeholder:text-muted-foreground/45"
                  onChange={(next) => onInput(key, metric.key, next)}
                  error={parsed.ok ? null : parsed.message}
                />
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-end gap-1">
          {editable && view.kind === 'unrecorded' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                isDisabled={locked}
                aria-label={`Skip set ${label} of ${exercise.name}`}
                onPress={() => save('skipped', {})}
              >
                Skip
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                isDisabled={locked || !body.ok}
                aria-label={`Done set ${label} of ${exercise.name}`}
                onPress={() => {
                  if (body.ok) {
                    save('completed', body.body);
                  }
                }}
              >
                <Check />
              </Button>
            </>
          )}
          {view.kind === 'completed' &&
            (editable && dirty ? (
              <Button
                size="sm"
                variant="outline"
                isDisabled={locked || !body.ok}
                aria-label={`Save changes to set ${label} of ${exercise.name}`}
                onPress={() => {
                  if (body.ok) {
                    save('completed', body.body);
                  }
                }}
              >
                Save
              </Button>
            ) : (
              <>
                {editable && view.set && view.activity && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 text-sm font-medium text-muted-foreground"
                    isDisabled={locked}
                    aria-label={`Clear set ${label} of ${exercise.name}`}
                    onPress={() => {
                      if (view.activity && view.set) {
                        onClear(view.activity.id, view.set.id);
                      }
                    }}
                  >
                    Clear
                  </Button>
                )}
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <Check aria-hidden="true" />
                </span>
              </>
            ))}
          {editable && view.kind === 'skipped' && view.set && view.activity && (
            <Button
              size="sm"
              variant="ghost"
              isDisabled={locked}
              aria-label={`Undo skip set ${label} of ${exercise.name}`}
              onPress={() => {
                if (view.activity && view.set) {
                  restoreFocus.current = true;
                  onUndoSkip(view.activity.id, view.set.id);
                }
              }}
            >
              Undo skip
            </Button>
          )}
        </div>
      </div>
      {perRound && target && view.kind === 'unrecorded' && (
        <p className="mt-1 pl-12 text-sm font-medium text-muted-foreground">Target: {targetLine(exercise, target)}</p>
      )}
      {view.set && (
        <SavedExtraValues
          exercise={exercise}
          set={view.set}
        />
      )}
    </div>
  );
}

function MeasurementInputs({
  exercise,
  scope,
  row,
  inputs,
  prefix,
  disabled,
  onInput,
}: {
  exercise: Exercise;
  scope: 'overall' | 'detail';
  row: Parameters<typeof savedInput>[0];
  inputs: MetricInputs;
  prefix: string;
  disabled: boolean;
  onInput: (metric: MetricKey, value: string) => void;
}) {
  const fieldId = useId();
  return (
    <div className="grid grid-cols-1 items-end gap-3 min-[360px]:grid-cols-2">
      {exercise.metrics.map((metric) => {
        const definition = measurementFields[metric.key];
        if (!definition || (scope === 'overall' && definition.scope === 'detail')) {
          return null;
        }
        const value = inputs[metric.key] ?? savedInput(row, metric.key);
        const parsed = parseMeasurement(metric.key, value);
        return metric.key === 'result' ? (
          <div
            key={metric.key}
            className="grid gap-2"
          >
            <Label
              id={`${fieldId}-${metric.key}-label`}
              htmlFor={`${fieldId}-${metric.key}`}
            >
              <span className="sr-only">{prefix} </span>
              {inputLabel(metric)}
            </Label>
            <SelectField
              key={metric.key}
              id={`${fieldId}-${metric.key}`}
              value={value}
              isDisabled={disabled}
              onChange={(next) => onInput(metric.key, next)}
            >
              <SelectItem id="">Unanswered</SelectItem>
              <SelectItem id="win">Win</SelectItem>
              <SelectItem id="draw">Draw</SelectItem>
              <SelectItem id="loss">Loss</SelectItem>
            </SelectField>
          </div>
        ) : (
          <Field
            key={metric.key}
            label={inputLabel(metric)}
            labelContext={prefix}
            value={value}
            isDisabled={disabled}
            inputMode={metric.key === 'duration' ? 'text' : 'decimal'}
            onChange={(next) => onInput(metric.key, next)}
            error={parsed.ok ? null : parsed.message}
          />
        );
      })}
    </div>
  );
}

function SavedExtraValues({exercise, set}: {exercise: Exercise; set: ExerciseSet}) {
  const selected = new Set(exercise.metrics.map((metric) => metric.key));
  const extra = metricKeys
    .filter((key) => !selected.has(key))
    .flatMap((key) => {
      const value = savedInput(set, key);
      return value === '' ? [] : [`${metricLabel(key)}: ${value}`];
    });
  for (const [label, value] of [
    ['Speed (m/s)', set.speed_m_s],
    ['Power (W)', set.power_w],
    ['Cadence', set.cadence_rpm],
    ['Heart rate (bpm)', set.heart_rate_bpm],
    ['Grade', set.grade],
  ]) {
    if (value !== null) {
      extra.push(`${label}: ${value}`);
    }
  }
  return extra.length ? <p className="mt-2 text-sm font-medium text-muted-foreground">{extra.join(' · ')}</p> : null;
}

function ExerciseChoices({onPick}: {onPick: (exercise: Exercise) => void}) {
  const [search, setSearch] = useState('');
  const query = useExercises(search);
  return (
    <>
      <Field
        label="Search exercises"
        type="search"
        value={search}
        onChange={setSearch}
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
          {query.data.data.map((exercise) => (
            <li key={exercise.id}>
              <Button
                variant="ghost"
                className="h-auto min-h-12 w-full flex-col items-start whitespace-normal text-left"
                onPress={() => onPick(exercise)}
              >
                <span>{exercise.name}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {exercise.metrics.map((metric) => metricLabel(metric.key, metric)).join(' · ')}
                </span>
              </Button>
            </li>
          ))}
          {query.data.data.length === 0 && <li>No exercises match this search.</li>}
        </ul>
      )}
    </>
  );
}

function FinishSheet({
  log,
  unrecorded,
  pending,
  error,
  onSave,
  onClose,
}: {
  log: WorkoutLog;
  unrecorded: number;
  pending: boolean;
  error: string;
  onSave: Props['onFinish'];
  onClose: () => void;
}) {
  const [effort, setEffort] = useState(log.effort === null ? '' : String(log.effort));
  const [pain, setPain] = useState(log.pain === null ? '' : log.pain ? 'yes' : 'no');
  const [text, setText] = useState(log.text ?? '');
  return (
    <BottomSheet
      title="Finish workout"
      pending={pending}
      onClose={onClose}
    >
      <fieldset
        disabled={pending}
        className="grid gap-5"
      >
        <fieldset>
          <legend className="mb-2 font-semibold">How hard was this session? (optional)</legend>
          <Choice
            label="How hard was this session?"
            value={effort || undefined}
            options={effortLabels.map((label, index) => ({value: String(index + 1), label}))}
            onChange={setEffort}
          />
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">Any pain or discomfort? (optional)</legend>
          <Choice
            label="Any pain or discomfort?"
            value={pain || undefined}
            options={[
              {value: 'yes', label: 'Yes'},
              {value: 'no', label: 'No'},
            ]}
            onChange={setPain}
          />
        </fieldset>
        <Field
          label="Note (optional)"
          value={text}
          onChange={setText}
        />
        {unrecorded > 0 && (
          <p className="text-sm font-medium text-muted-foreground">
            {plural(unrecorded, 'set')} not recorded. They stay empty.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="font-medium text-destructive"
          >
            {error}
          </p>
        )}
        <Button
          isPending={pending}
          onPress={() => {
            onSave(feedbackBody(log, {effort, pain, text}));
          }}
        >
          Finish workout
        </Button>
      </fieldset>
    </BottomSheet>
  );
}

function PlanEditor({
  row,
  onClose,
  onSave,
}: {
  row: WorkoutRow;
  onClose: () => void;
  onSave: (body: ExerciseLogUpdate) => void;
}) {
  const [initial] = useState(() => planDraft(row, '', []));
  const [rounds, setRounds] = useState(String(initial.initialRounds));
  const [rests, setRests] = useState(initial.rests);
  const {mode, minimum, rests: draftRests, valid, body} = planDraft(row, rounds, rests);
  return (
    <BottomSheet
      title="Edit rounds and rest"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Field
          label="Planned rounds"
          inputMode="numeric"
          value={rounds}
          onChange={setRounds}
        />
        {draftRests.map((rest, index) => (
          <fieldset
            key={index}
            className="grid gap-3"
          >
            <legend className="mb-2 font-semibold">
              {mode === 'same_for_all' ? 'Rest after each round' : `Rest after round ${index + 1}`}
            </legend>
            <SelectField
              aria-label={`Rest mode after round ${index + 1}`}
              value={rest.mode}
              onChange={(value) => {
                const mode = restModes.find((mode) => mode === value);
                if (mode) {
                  setRests(draftRests.map((item, position) => (position === index ? {...item, mode} : item)));
                }
              }}
            >
              <SelectItem id="client_chooses">Client chooses</SelectItem>
              <SelectItem id="none">None</SelectItem>
              <SelectItem id="exact">Exact</SelectItem>
              <SelectItem id="range">Range</SelectItem>
            </SelectField>
            {(rest.mode === 'exact'
              ? (['value'] as const)
              : rest.mode === 'range'
                ? (['min', 'max'] as const)
                : []
            ).map((field) => (
              <Field
                key={field}
                label={`${field === 'value' ? 'Rest' : field === 'min' ? 'Minimum rest' : 'Maximum rest'} in seconds`}
                inputMode="decimal"
                value={rest[field]}
                onChange={(value) =>
                  setRests(draftRests.map((item, position) => (position === index ? {...item, [field]: value} : item)))
                }
              />
            ))}
          </fieldset>
        ))}
        {!valid && (
          <p
            role="alert"
            className="font-medium text-destructive"
          >
            Use {minimum} to 10,000 rounds and a valid rest duration or range. Recorded rounds must stay included.
          </p>
        )}
        <Button
          isDisabled={!valid}
          onPress={() => {
            if (body) {
              onSave(body);
            }
          }}
        >
          Save plan changes
        </Button>
      </div>
    </BottomSheet>
  );
}
