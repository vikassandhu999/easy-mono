import {measurementFields, parseMeasurement} from '@easy/workouts/measurements';
import {type MetricKey, metricKeys, metricLabel} from '@easy/workouts/metrics';
import {mismatch, type RecordingRow, rowsFor, type Slot} from '@easy/workouts/recording';
import {
  effortLabel,
  effortLabels,
  feedbackBody,
  hasRecordedWork,
  inputLabel,
  type MetricInputs,
  measurementBody,
  overallInputKey,
  planDraft,
  restModes,
  roundsFor,
  savedInput,
  selectedActivity,
  slotModel,
  targetLine,
  type WorkoutDraft,
} from '@easy/workouts/session';
import {type ReactNode, useEffect, useId, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
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
        <p
          role="status"
          className="text-sm font-medium text-muted-foreground"
        >
          {saved
            ? 'All changes saved.'
            : durable.state === 'saving'
              ? 'Keeping changes on this device…'
              : 'Changes are kept on this device.'}
        </p>
      }
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
  session: Session;
};

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
        description={`${props.date} · ${log.state === 'completed' ? 'Completed' : log.state === 'discarded' ? 'Discarded' : 'In progress'}`}
      />
      {(editable || pending || props.error || blocked) && (
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
          return (
            <section
              key={sourceId}
              aria-label={`Activity ${exercise.name}`}
              className="min-w-0 space-y-3"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="editor-section-title">{exercise.name}</h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {row.entry && exercise.id !== row.entry.exercise_id
                      ? `Instead of ${row.entry.exercise.name} · `
                      : ''}
                    {row.slots.some((slot) => slot.side !== null) ? 'Each side · ' : ''}
                    {roundsFor(workout, row)} rounds
                    {activitySkipped
                      ? ' · Activity skipped'
                      : selected?.state === 'completed'
                        ? ' · Activity completed'
                        : ''}
                  </p>
                </div>
                {editable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Swap ${exercise.name}`}
                    isDisabled={locked}
                    onPress={() => setSwap(row)}
                  >
                    Swap
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                {row.slots.map((slot) => (
                  <SlotRow
                    key={`${slot.round}.${slot.side}`}
                    row={row}
                    slot={slot}
                    log={log}
                    fallback={exercise}
                    draft={draft}
                    editable={editable && !activitySkipped}
                    locked={locked}
                    onInput={props.session.input}
                    onSave={props.session.saveSlot}
                    onRemove={(activityId, setId) => setRemove({activityId, setId})}
                  />
                ))}
              </div>
              <details
                open={exercise.kind === 'activity'}
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
                  {editable && !activitySkipped && (
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={locked || !overall.ok || !Object.keys(overallInputs).length}
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
              {editable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={locked}
                    onPress={() => setPlan(row)}
                  >
                    Edit rounds and rest
                  </Button>
                  {selected && row.entry && (
                    <Button
                      size="sm"
                      variant="outline"
                      isDisabled={locked || activitySkipped}
                      onPress={() => props.session.copyTargets(row)}
                    >
                      Copy targets
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
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={locked || hasRecordedWork(selected)}
                        onPress={() => props.session.activityOutcome(row, 'skipActivity')}
                      >
                        Skip activity
                      </Button>
                    </>
                  )}
                </div>
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
          title="Remove this set?"
          action="Remove set"
          cancel="Keep set"
          destructive
          pending={pending}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            props.session.removeSet(remove.activityId, remove.setId);
            setRemove(null);
          }}
        >
          This removes only this set's outcome and measurements. Its slot becomes unrecorded.
        </Confirm>
      )}
    </Page>
  );
}

function SlotRow({
  row,
  slot,
  log,
  fallback,
  draft,
  editable,
  locked,
  onInput,
  onSave,
  onRemove,
}: {
  row: WorkoutRow;
  slot: Slot;
  log: WorkoutLog;
  fallback: Exercise;
  draft: WorkoutDraft;
  editable: boolean;
  locked: boolean;
  onInput: Session['input'];
  onSave: Session['saveSlot'];
  onRemove: (activityId: string, setId: string) => void;
}) {
  const firstAction = useRef<HTMLButtonElement>(null);
  const legend = useRef<HTMLLegendElement>(null);
  const focusAfterSave = useRef(false);
  useEffect(() => {
    if (!locked && focusAfterSave.current) {
      focusAfterSave.current = false;
      const action = firstAction.current;
      if (editable && action && !action.disabled && action.getAttribute('aria-disabled') !== 'true') {
        action.focus();
      } else {
        legend.current?.focus();
      }
    }
  }, [locked, editable]);
  const model = slotModel(log, row, slot, draft, fallback);
  if (!model) {
    return null;
  }
  const {view, exercise, key, inputs, body, label, name, target} = model;
  return (
    <fieldset
      aria-label={name}
      className="min-w-0 rounded-xl bg-muted/40 p-3 lg:grid lg:grid-cols-[minmax(10rem,1fr)_minmax(0,2fr)_auto] lg:items-start lg:gap-4"
    >
      <legend
        ref={legend}
        tabIndex={-1}
        className="max-w-full break-words font-bold"
      >
        {name}
      </legend>
      <p className="mb-2 text-sm font-medium text-muted-foreground lg:col-start-1 lg:row-start-1 lg:pt-8">
        Target: {targetLine(exercise, target)}
      </p>
      <p
        className="mb-2 font-semibold lg:col-start-1 lg:row-start-2"
        role="status"
      >
        {view.kind === 'completed' ? 'Done' : view.kind === 'skipped' ? 'Skipped' : 'Unrecorded'}
      </p>
      <MeasurementInputs
        exercise={exercise}
        scope="detail"
        row={view.set}
        inputs={inputs}
        prefix={name}
        disabled={!editable || locked}
        onInput={(metric, value) => onInput(key, metric, value)}
      />
      {view.set && (
        <SavedExtraValues
          exercise={exercise}
          set={view.set}
        />
      )}
      {editable && (
        <div className="mt-3 flex flex-wrap gap-2 lg:col-start-3 lg:row-start-1 lg:mt-0 lg:max-w-52">
          <Button
            ref={firstAction}
            size="sm"
            variant={view.kind === 'completed' ? 'outline' : 'default'}
            isDisabled={locked || !body.ok}
            aria-label={
              view.kind === 'completed'
                ? `Save changes to set ${label} of ${exercise.name}`
                : `Done set ${label} of ${exercise.name}`
            }
            onPress={() => {
              if (body.ok) {
                focusAfterSave.current = true;
                onSave(row, slot, 'completed', body.body, key);
              }
            }}
          >
            {view.kind === 'completed' ? 'Save changes' : 'Done'}
          </Button>
          {view.kind === 'unrecorded' && (
            <Button
              size="sm"
              variant="outline"
              isDisabled={locked}
              aria-label={`Skip set ${label} of ${exercise.name}`}
              onPress={() => {
                focusAfterSave.current = true;
                onSave(row, slot, 'skipped', {}, key);
              }}
            >
              Skip
            </Button>
          )}
          {view.set && view.activity && (
            <Button
              size="sm"
              variant="ghost"
              isDisabled={locked}
              aria-label={`Remove set ${label} of ${exercise.name}`}
              onPress={() => {
                if (view.activity && view.set) {
                  onRemove(view.activity.id, view.set.id);
                }
              }}
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </fieldset>
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
  pending,
  error,
  onSave,
  onClose,
}: {
  log: WorkoutLog;
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
        <fieldset>
          <legend className="mb-2 font-semibold lg:col-start-1 lg:row-start-2">
            How hard was this session? (optional)
          </legend>
          <Choice
            label="How hard was this session?"
            value={effort || undefined}
            options={effortLabels.map((label, index) => ({value: String(index + 1), label}))}
            onChange={setEffort}
          />
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold lg:col-start-1 lg:row-start-2">
            Any pain or discomfort? (optional)
          </legend>
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
          Save workout
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
            <legend className="mb-2 font-semibold lg:col-start-1 lg:row-start-2">
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
