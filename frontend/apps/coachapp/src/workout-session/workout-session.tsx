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
import {type CSSProperties, type ReactNode, useEffect, useId, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {type Exercise, useExercises} from '../api/exercises';
import {getSession} from '../api/session';
import {
  type ExerciseLog,
  type ExerciseLogUpdate,
  type ExerciseSet,
  useWorkoutLog,
  type WorkoutLog,
} from '../api/workout-logs';
import {useWorkout, type Workout, type WorkoutExercise} from '../api/workouts';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Page, PageHeader} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {Textarea} from '../ui/textarea';

import {useSessionRecording} from './use-session-recording';

type WorkoutRow = RecordingRow<WorkoutExercise, ExerciseLog>;
type Session = ReturnType<typeof useSessionRecording>['session'];

export function WorkoutSession() {
  const {id = '', logId = ''} = useParams();
  const query = useWorkoutLog(id, logId);
  if (!query.data) {
    return (
      <Page className="editor-page">
        <PageHeader
          title="Workout session"
          back={{to: `/clients/${id}/training`, label: 'Training week'}}
        />
        {query.isError ? (
          <>
            <FormError message={errorMessage(query.error, 'Could not open this session.')} />
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Opening session…</p>
        )}
      </Page>
    );
  }
  return (
    <SessionEditor
      key={`${getSession()?.id}:${id}:${logId}`}
      clientId={id}
      initial={query.data.data}
    />
  );
}

function SessionEditor({clientId, initial}: {clientId: string; initial: WorkoutLog}) {
  const prescribed = useWorkout(initial.workout_id ?? '', clientId);
  const profile = useProfile();
  const person = useClient(clientId).data?.data;
  const {local, busy, error, saved, durable, session} = useSessionRecording({initial, clientId});
  const draft = durable.draft;
  const workout: Workout | undefined = local.workout_id
    ? prescribed.data?.data
    : {
        id: local.id,
        client_id: clientId,
        name: 'Workout session',
        description: null,
        type: 'open',
        video: null,
        groups: [],
      };
  if (!workout || !draft) {
    return (
      <Page className="editor-page">
        <PageHeader
          title="Workout session"
          back={{to: `/clients/${clientId}/training`, label: 'Training week'}}
        />
        {!draft ? (
          <p role="status">Opening the device draft…</p>
        ) : prescribed.isError ? (
          <FormError message={errorMessage(prescribed.error, 'Could not open the workout instructions.')} />
        ) : (
          <p role="status">Opening workout instructions…</p>
        )}
        {prescribed.isError && (
          <Button
            onPress={() => {
              prescribed.refetch();
            }}
          >
            Try again
          </Button>
        )}
      </Page>
    );
  }
  return (
    <RecordingView
      workout={workout}
      log={local}
      date={local.date}
      back={`/clients/${clientId}/training`}
      pending={busy}
      blocked={Boolean(draft.pending)}
      draft={draft}
      error={error || durable.loadError}
      draftStatus={
        durable.state === 'error' ? (
          <p
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            Changes could not be kept on this device. Keep this screen open until they are saved.
          </p>
        ) : saved ? (
          <p
            role="status"
            className="text-sm font-medium text-muted-foreground"
          >
            All changes saved.
          </p>
        ) : null
      }
      clientName={person?.preferred_name || person?.full_name || 'the client'}
      {...(profile.data ? {viewerCoachId: profile.data.data.id} : {})}
      session={session}
    />
  );
}

function SessionDialog({
  title,
  pending = false,
  children,
  onClose,
}: {
  title: string;
  pending?: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      isOpen
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
      showCloseButton={!pending}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">{children}</div>
    </Dialog>
  );
}
function Confirm({
  title,
  action,
  cancel,
  destructive,
  pending,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  action: string;
  cancel: string;
  destructive: boolean;
  pending: boolean;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <SessionDialog
      title={title}
      pending={pending}
      onClose={onClose}
    >
      <p>{children}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          isDisabled={pending}
          onPress={onClose}
        >
          {cancel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          isPending={pending}
          onPress={onConfirm}
        >
          {action}
        </Button>
      </div>
    </SessionDialog>
  );
}
function Field({
  label,
  labelContext,
  value,
  onChange,
  isDisabled = false,
  inputMode = 'text',
  type = 'text',
  error,
  multiline = false,
}: {
  label: string;
  labelContext?: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  type?: 'text' | 'search';
  error?: string | null;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id}>
        {labelContext && <span className="sr-only">{labelContext} </span>}
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          disabled={isDisabled}
          maxLength={10000}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          disabled={isDisabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: {value: T; label: string}[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          aria-pressed={value === option.value}
          onPress={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

type Props = {
  workout: Workout;
  log: WorkoutLog;
  date: string;
  back: string;
  pending: boolean;
  blocked: boolean;
  draft: WorkoutDraft;
  error: string;
  draftStatus: ReactNode;
  clientName: string;
  session: Session;
};

const sessionDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

function RecordingView(props: Props & {viewerCoachId?: string}) {
  const {workout, log, pending, blocked} = props;
  const draft = log.state === 'active' ? props.draft : {...props.draft, inputs: {}};
  const [swap, setSwap] = useState<WorkoutRow | 'add' | null>(null);
  const [plan, setPlan] = useState<WorkoutRow | null>(null);
  const [finish, setFinish] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState<{activityId: string; setId: string} | null>(null);
  const editable = log.state === 'active';
  const locked = pending || blocked;
  const rows = rowsFor(workout, log);
  return (
    <Page className="editor-page min-w-0 pb-12">
      <PageHeader
        title={workout.name}
        back={{to: props.back, label: 'Training week'}}
        description={`${sessionDate(props.date)} · ${log.state === 'completed' ? 'Completed' : log.state === 'discarded' ? 'Discarded' : 'In progress'}`}
      />
      {(pending || props.error || blocked || props.draftStatus) && (
        <div
          role="region"
          aria-label="Workout save status"
          className="sticky top-[var(--app-header-height)] z-30 grid gap-2 border-b border-border bg-background py-3"
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
                onPress={props.session.retry}
              >
                Retry saving
              </Button>
            </>
          )}
        </div>
      )}
      {workout.description && (
        <section
          aria-label="Instructions for the client"
          className="mb-5 rounded-2xl bg-muted p-4"
        >
          <p className="text-sm font-semibold text-muted-foreground">Instructions for the client</p>
          <p className="whitespace-pre-wrap font-medium">{workout.description}</p>
        </section>
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
      {(log.recorded_by === 'client' || log.coach_id !== props.viewerCoachId) && (
        <p
          role="status"
          className="mb-4 rounded-2xl bg-muted p-4 font-semibold"
        >
          {log.state === 'active'
            ? `${log.recorder_name} is recording this session`
            : `Recorded by ${log.recorder_name}`}
        </p>
      )}
      {log.state === 'completed' && (
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
          const overallKey = overallInputKey(sourceId, exercise.id);
          const overallInputs = draft.inputs[overallKey] ?? {};
          const overall = measurementBody(exercise, overallInputs, 'overall', true);
          const warning = selected ? mismatch(selected) : null;
          const activitySkipped = selected?.state === 'skipped';
          const swapped = Boolean(row.entry && exercise.id !== row.entry.exercise_id);
          const targets = selected?.targets ?? row.entry?.targets ?? [];
          const summary = targetSummary(
            exercise,
            targets,
            selected?.targets_mode ?? row.entry?.targets_mode ?? 'same_for_all',
          );
          const hasOverall = Boolean(selected && hasOverallResult(selected));
          return (
            <section
              key={sourceId}
              aria-label={`Activity ${exercise.name}`}
              className="min-w-0 space-y-3 border-t border-border pt-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="editor-section-title">{exercise.name}</h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {swapped && row.entry ? `Instead of ${row.entry.exercise.name} · ` : ''}
                    {row.slots.some((slot) => slot.side !== null) ? 'Each side · ' : ''}
                    {plural(roundsFor(workout, row), 'round')}
                    {summary ? ` · Target: ${summary}` : ''}
                    {activitySkipped
                      ? ' · Activity skipped'
                      : selected?.state === 'completed'
                        ? ' · Activity completed'
                        : ''}
                  </p>
                </div>
                {editable && (
                  <div className="flex flex-wrap gap-1">
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
                        onPress={() => props.session.copyTargets(row)}
                      >
                        Copy original targets
                      </Button>
                    )}
                    {selected?.state === 'completed' || activitySkipped ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={locked}
                        onPress={() => props.session.activityOutcome(row, 'reopenActivity')}
                      >
                        Reopen activity
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={locked}
                          onPress={() => props.session.activityOutcome(row, 'completeActivity')}
                        >
                          Complete activity
                        </Button>
                        {!hasRecordedWork(selected) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            isDisabled={locked}
                            onPress={() => props.session.activityOutcome(row, 'skipActivity')}
                          >
                            Skip activity
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
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
                    onInput={props.session.input}
                    onSave={props.session.saveSlot}
                    onClear={(activityId, setId) => setRemove({activityId, setId})}
                    onUndoSkip={props.session.removeSet}
                  />
                ))}
              </div>
              <details
                open={hasOverall || (exercise.kind === 'activity' && !row.slots.length)}
                className="border-t border-border pt-2"
              >
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">Overall result</summary>
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
                    onInput={(metric, value) => props.session.input(overallKey, metric, value)}
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
                          props.session.saveActivity(row, overall.body, overallKey);
                        }
                      }}
                    >
                      Save overall result
                    </Button>
                  )}
                </fieldset>
              </details>
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
        {log.state === 'completed' && (
          <Button
            variant="outline"
            isDisabled={locked}
            onPress={props.session.reopen}
          >
            Reopen
          </Button>
        )}
      </footer>
      {swap && (
        <SessionDialog
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
                props.session.addActivity(choice.id);
              } else {
                props.session.swap(swap, choice.id);
              }
              setSwap(null);
            }}
          />
        </SessionDialog>
      )}
      {plan && (
        <PlanEditor
          row={plan}
          onClose={() => setPlan(null)}
          onSave={(body) => {
            props.session.saveActivity(plan, body);
            setPlan(null);
          }}
        />
      )}
      {finish && log.state === 'active' && (
        <FinishSheet
          log={log}
          clientName={props.clientName}
          unrecorded={unrecordedCount(log, rows)}
          pending={pending || blocked}
          error={props.error}
          onClose={() => setFinish(false)}
          onSave={props.session.finish}
        />
      )}
      {discard && log.state === 'active' && (
        <Confirm
          title={`Discard ${workout.name}?`}
          action="Discard workout"
          cancel="Keep going"
          destructive
          pending={pending}
          onClose={() => setDiscard(false)}
          onConfirm={props.session.discard}
        >
          Discarded sessions stay in the client's history.
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
            props.session.removeSet(remove.activityId, remove.setId);
            setRemove(null);
          }}
        >
          Its values are removed and the set shows as not recorded.
        </Confirm>
      )}
    </Page>
  );
}

// One header for the metric names, then one short row per set (the client prototype's set table).
const setGrid =
  'grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2 md:grid-cols-[3.5rem_max-content_9.5rem] md:justify-start md:gap-4';
// Columns share one fixed width on desktop so every row's actions line up, including skipped rows.
const metricColumns = (count: number) => ({'--metric-columns': Math.min(count, 4)}) as CSSProperties;
const metricGrid =
  'grid gap-2 grid-cols-[repeat(var(--metric-columns),minmax(0,1fr))] md:grid-cols-[repeat(var(--metric-columns),8rem)]';

function detailMetrics(exercise: Exercise) {
  return exercise.metrics.filter((metric) => measurementFields[metric.key]);
}

function SetTableHeader({exercise}: {exercise: Exercise}) {
  const metrics = detailMetrics(exercise);
  return (
    <div
      aria-hidden="true"
      className={`${setGrid} px-2 text-sm font-semibold text-muted-foreground`}
    >
      <span>Set</span>
      <span
        className={metricGrid}
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
  onInput: Session['input'];
  onSave: Session['saveSlot'];
  onClear: (activityId: string, setId: string) => void;
  onUndoSkip: (activityId: string, setId: string) => void;
}) {
  const group = useRef<HTMLDivElement>(null);
  const focusAfterSave = useRef(false);
  useEffect(() => {
    if (!locked && focusAfterSave.current) {
      focusAfterSave.current = false;
      group.current?.focus({preventScroll: true});
    }
  }, [locked]);
  const fieldId = useId();
  const model = slotModel(log, row, slot, draft, fallback);
  if (!model) {
    return null;
  }
  const {view, exercise, key, inputs, body, label, name, target} = model;
  const dirty = Object.keys(inputs).length > 0;
  const short = `${slot.round}${slot.side ? ` ${slot.side === 'left' ? 'L' : 'R'}` : ''}`;
  const metrics = detailMetrics(exercise);
  const save = (state: 'completed' | 'skipped', values: Parameters<Session['saveSlot']>[3]) => {
    focusAfterSave.current = true;
    onSave(row, slot, state, values, key);
  };
  const errors = metrics.flatMap((metric) => {
    const parsed = parseMeasurement(metric.key, inputs[metric.key] ?? savedInput(view.set, metric.key));
    return parsed.ok ? [] : [`${metricLabel(metric.key, metric)}: ${parsed.message}`];
  });
  return (
    <div
      ref={group}
      role="group"
      aria-label={name}
      tabIndex={-1}
      className={cn(
        'rounded-xl px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        view.kind === 'completed' && 'bg-muted',
        view.kind === 'skipped' && 'text-muted-foreground',
      )}
    >
      <div className={setGrid}>
        <span className="font-semibold tabular-nums">
          <span aria-hidden="true">{short}</span>
          <span className="sr-only">
            Set {label}: {view.kind === 'completed' ? 'Done' : view.kind === 'skipped' ? 'Skipped' : 'Unrecorded'}
          </span>
        </span>
        {view.kind === 'skipped' ? (
          <div
            className={metricGrid}
            style={metricColumns(metrics.length)}
          >
            <span className="col-span-full justify-self-start rounded-full border border-dashed border-muted-foreground px-3 py-1 text-sm font-semibold">
              Skipped
            </span>
          </div>
        ) : (
          <div
            className={metricGrid}
            style={metricColumns(metrics.length)}
          >
            {metrics.map((metric) => {
              const value = inputs[metric.key] ?? savedInput(view.set, metric.key);
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
                <Input
                  key={metric.key}
                  aria-label={`${name} ${inputLabel(metric)}`}
                  aria-invalid={!parseMeasurement(metric.key, value).ok}
                  aria-describedby={errors.length ? `${fieldId}-error` : undefined}
                  className="text-center font-semibold tabular-nums placeholder:font-normal placeholder:text-muted-foreground/45"
                  inputMode={metric.key === 'duration' ? 'text' : 'decimal'}
                  placeholder={targetPlaceholder(metric.key, target?.[metric.key])}
                  value={value}
                  disabled={!editable || locked}
                  onChange={(event) => onInput(key, metric.key, event.target.value)}
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
                className="px-3"
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
                    className="px-3 font-medium text-muted-foreground"
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
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
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
                  focusAfterSave.current = true;
                  onUndoSkip(view.activity.id, view.set.id);
                }
              }}
            >
              Undo skip
            </Button>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <p
          id={`${fieldId}-error`}
          className="mt-1 pl-[4.25rem] text-sm font-medium text-destructive"
        >
          {errors.join(' · ')}
        </p>
      )}
      {perRound && target && view.kind === 'unrecorded' && (
        <p className="mt-1 pl-[4.25rem] text-sm font-medium text-muted-foreground">
          Target: {targetLine(exercise, target)}
        </p>
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
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 items-end gap-3 min-[360px]:grid-cols-2',
        scope === 'detail' && 'lg:col-start-2 lg:row-span-2 lg:row-start-1',
      )}
    >
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
  const query = useExercises({search});
  return (
    <div className="space-y-4">
      <Field
        label="Search exercises"
        type="search"
        value={search}
        onChange={setSearch}
      />
      <InfiniteList
        query={query}
        label="exercises"
        singular="exercise"
        empty={<p>No exercises match this search.</p>}
      >
        {(exercise) => (
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
        )}
      </InfiniteList>
    </div>
  );
}

function FinishSheet({
  log,
  clientName,
  unrecorded,
  pending,
  error,
  onSave,
  onClose,
}: {
  log: WorkoutLog;
  clientName: string;
  unrecorded: number;
  pending: boolean;
  error: string;
  onSave: Session['finish'];
  onClose: () => void;
}) {
  const [effort, setEffort] = useState(log.effort === null ? '' : String(log.effort));
  const [pain, setPain] = useState(log.pain === null ? '' : log.pain ? 'yes' : 'no');
  const [text, setText] = useState(log.text ?? '');
  return (
    <SessionDialog
      title="Finish workout"
      pending={pending}
      onClose={onClose}
    >
      <fieldset
        disabled={pending}
        className="grid gap-5"
      >
        <p className="text-sm font-medium text-muted-foreground">Enter {clientName}'s answers, or leave them blank.</p>
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
          multiline
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
    </SessionDialog>
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
    <SessionDialog
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
    </SessionDialog>
  );
}
