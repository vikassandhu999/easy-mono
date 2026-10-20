import {measurementFields, parseMeasurement} from './measurements.ts';
import {type MetricKey, metricCatalogue, metricKeys, metricLabel} from './metrics.ts';
import {
  type RecordingActivity,
  type RecordingEntry,
  type RecordingLog,
  type RecordingRow,
  type RecordingWorkout,
  type Slot,
  slotOutcome,
} from './recording.ts';
import {formatRest, formatTarget, type RestTarget, type Target} from './targets.ts';

type FieldName = NonNullable<(typeof measurementFields)[MetricKey]>['field'];
export type MeasurementBody = Partial<Record<Exclude<FieldName, 'result'>, number | null>> & {
  result?: 'win' | 'draw' | 'loss' | null;
};
export type MetricInputs = Partial<Record<MetricKey, string>>;
export type RoundTargets = Partial<Record<MetricKey | 'grade', Target | null>> & {rest: RestTarget};
export type RoundTargetsInput = Omit<RoundTargets, 'rest'> & {rest?: RestTarget | null};
export type SessionExercise = {id: string; name: string; metrics: readonly {key: MetricKey; label: string | null}[]};
export type SessionEntry = RecordingEntry & {
  exercise: SessionExercise;
  targets_mode: 'same_for_all' | 'per_round';
  targets: readonly RoundTargets[];
};
export type SessionActivity = RecordingActivity & {
  exercise: SessionExercise;
  targets_mode: 'same_for_all' | 'per_round';
  targets: readonly RoundTargets[];
};
export type SessionLog = RecordingLog<SessionActivity> & {id: string};
export type SessionRow = RecordingRow<SessionEntry, SessionActivity>;
export type SessionFeedback = {effort?: number | null; pain?: boolean | null; text?: string | null};
export type ActivityUpdate = MeasurementBody & {
  rounds?: number;
  targets_mode?: 'same_for_all' | 'per_round';
  targets?: RoundTargetsInput[];
};
export type SessionOperation =
  | {
      action: 'start';
      body: {
        id?: string;
        date?: string;
        time?: string | null;
        workout_id?: string | null;
        schedule_id?: string | null;
        scheduled_date?: string | null;
      };
    }
  | {action: 'update'; id: string; body: SessionFeedback & {date?: string; time?: string | null}}
  | {action: 'finish'; id: string; body: SessionFeedback}
  | {action: 'discard' | 'reopen'; id: string}
  | {
      action: 'startActivity';
      id: string;
      body: {id: string; exercise_id: string; workout_exercise_id?: string | null; side_mode?: 'combined' | 'per_side'};
    }
  | {action: 'updateActivity'; id: string; activityId: string; body: ActivityUpdate}
  | {action: 'completeActivity'; id: string; activityId: string; body: Omit<MeasurementBody, 'reserve'>}
  | {action: 'skipActivity' | 'reopenActivity'; id: string; activityId: string}
  | {action: 'replaceActivity'; id: string; activityId: string; body: {id: string; exercise_id: string}}
  | {
      action: 'recordSet';
      id: string;
      activityId: string;
      body: MeasurementBody & {id: string; state: 'completed' | 'skipped'; round: number; side?: Slot['side']};
    }
  | {
      action: 'correctSet';
      id: string;
      activityId: string;
      setId: string;
      body: MeasurementBody & {state?: 'completed' | 'skipped'};
    }
  | {action: 'removeSet'; id: string; activityId: string; setId: string};

export type PendingRecording = {commands: SessionOperation[]; clearInputs: string[]};
export type WorkoutDraft = {
  version: 1;
  inputs: Record<string, MetricInputs>;
  pending: PendingRecording | null;
};
export const effortLabels = ['Very easy', 'Easy', 'Moderate', 'Hard', 'Very hard'] as const;
export const effortLabel = (effort: number | null) => (effort === null ? '' : (effortLabels[effort - 1] ?? ''));
export const emptyWorkoutDraft = (): WorkoutDraft => ({version: 1, inputs: {}, pending: null});
export const slotInputKey = (source: string, exerciseId: string, slot: Slot) =>
  `slot.${source}.${exerciseId}.${slot.round}.${slot.side ?? 'combined'}`;
export const overallInputKey = (source: string, exerciseId: string) => `overall.${source}.${exerciseId}`;

export function slotView<A extends RecordingActivity>(
  log: RecordingLog<A>,
  source: Pick<RecordingActivity, 'id' | 'workout_exercise_id'>,
  slot: Slot,
) {
  const outcome = slotOutcome(log, source, slot);
  const activity =
    outcome.kind === 'unrecorded' ? null : (log.exercise_logs.find((row) => row.id === outcome.activityId) ?? null);
  const sets: readonly A['sets'][number][] = activity?.sets ?? [];
  const set = outcome.kind === 'unrecorded' ? null : (sets.find((row) => row.id === outcome.setId) ?? null);
  return {kind: outcome.kind, activity, set};
}

export function measurementBody(
  exercise: Pick<SessionExercise, 'metrics'>,
  inputs: MetricInputs,
  scope: 'overall' | 'detail',
  clearEmpty = false,
): {ok: true; body: MeasurementBody} | {ok: false; message: string} {
  const body: MeasurementBody = {};
  for (const metric of exercise.metrics) {
    const definition = measurementFields[metric.key];
    const input = inputs[metric.key];
    if (!definition || input === undefined || (scope === 'overall' && definition.scope === 'detail')) {
      continue;
    }
    const parsed = parseMeasurement(metric.key, input);
    if (!parsed.ok) {
      return parsed;
    }
    if (parsed.value === null && !clearEmpty) {
      continue;
    }
    if (definition.field === 'result') {
      if (parsed.value === null || parsed.value === 'win' || parsed.value === 'draw' || parsed.value === 'loss') {
        body.result = parsed.value;
      } else {
        return {ok: false, message: 'Choose Win, Draw, or Loss.'};
      }
    } else if (parsed.value === null || typeof parsed.value === 'number') {
      body[definition.field] = parsed.value;
    }
  }
  return {ok: true, body};
}

export function savedInput(row: MeasurementBody | null, metric: MetricKey): string {
  const field = measurementFields[metric]?.field;
  if (!row || !field) {
    return '';
  }
  const value = row[field];
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '';
}

export function queueCommands(draft: WorkoutDraft, commands: SessionOperation[], clearInputs: string[]): WorkoutDraft {
  return draft.pending ? draft : {...draft, pending: {commands, clearInputs}};
}
export function acknowledgeCommand(draft: WorkoutDraft): WorkoutDraft {
  if (!draft.pending) {
    return draft;
  }
  const commands = draft.pending.commands.slice(1);
  if (commands.length) {
    return {...draft, pending: {...draft.pending, commands}};
  }
  const inputs = {...draft.inputs};
  for (const key of draft.pending.clearInputs) {
    delete inputs[key];
  }
  return {...draft, inputs, pending: null};
}
export function copyTargets(entry: Pick<SessionEntry, 'targets' | 'targets_mode'>, activity: SessionActivity) {
  const count = activity.targets_mode === 'same_for_all' ? 1 : activity.rounds;
  const targets: RoundTargets[] = Array.from({length: count}, (_, index) => {
    const source = entry.targets[entry.targets_mode === 'same_for_all' ? 0 : index];
    const target: RoundTargets = {rest: activity.targets[index]?.rest ?? {mode: 'client_chooses'}};
    for (const metric of activity.exercise.metrics) {
      const value = source?.[metric.key];
      if (value) {
        target[metric.key] = {...value};
      }
    }
    return target;
  });
  return {targets_mode: activity.targets_mode, targets};
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validOperation(value: unknown): value is SessionOperation {
  if (!object(value) || typeof value.action !== 'string') {
    return false;
  }
  const bodyActions = [
    'start',
    'update',
    'finish',
    'startActivity',
    'updateActivity',
    'completeActivity',
    'replaceActivity',
    'recordSet',
    'correctSet',
  ];
  const actions = [...bodyActions, 'discard', 'reopen', 'skipActivity', 'reopenActivity', 'removeSet'];
  if (!actions.includes(value.action) || (value.action !== 'start' && typeof value.id !== 'string')) {
    return false;
  }
  if (bodyActions.includes(value.action) && !object(value.body)) {
    return false;
  }
  if (
    ['start', 'startActivity', 'replaceActivity', 'recordSet'].includes(value.action) &&
    (!object(value.body) || typeof value.body.id !== 'string')
  ) {
    return false;
  }
  if (
    [
      'updateActivity',
      'completeActivity',
      'skipActivity',
      'reopenActivity',
      'replaceActivity',
      'recordSet',
      'correctSet',
      'removeSet',
    ].includes(value.action) &&
    typeof value.activityId !== 'string'
  ) {
    return false;
  }
  return !['correctSet', 'removeSet'].includes(value.action) || typeof value.setId === 'string';
}
export function parseWorkoutDraft(raw: unknown, logId?: string): WorkoutDraft | null {
  if (!object(raw) || raw.version !== 1 || !object(raw.inputs) || !('pending' in raw)) {
    return null;
  }
  const inputs: Record<string, MetricInputs> = {};
  for (const [name, input] of Object.entries(raw.inputs)) {
    if (
      !object(input) ||
      Object.entries(input).some(
        ([key, value]) => !metricKeys.some((metric) => metric === key) || typeof value !== 'string',
      )
    ) {
      return null;
    }
    const values: MetricInputs = {};
    for (const metric of metricKeys) {
      const value = input[metric];
      if (typeof value === 'string') {
        values[metric] = value;
      }
    }
    inputs[name] = values;
  }
  if (raw.pending === null) {
    return {version: 1, inputs, pending: null};
  }
  const pending = raw.pending;
  if (
    !object(pending) ||
    !Array.isArray(pending.commands) ||
    !pending.commands.length ||
    !Array.isArray(pending.clearInputs)
  ) {
    return null;
  }
  const commands: SessionOperation[] = [];
  for (const command of pending.commands) {
    if (
      !validOperation(command) ||
      (logId !== undefined && (command.action === 'start' || !('id' in command) || command.id !== logId))
    ) {
      return null;
    }
    commands.push(command);
  }
  const clearInputs: string[] = [];
  for (const key of pending.clearInputs) {
    if (typeof key !== 'string') {
      return null;
    }
    clearInputs.push(key);
  }
  return {version: 1, inputs, pending: {commands, clearInputs}};
}

export function inputLabel(metric: {key: MetricKey; label: string | null}) {
  const unit = metric.key === 'reps' ? '' : metric.key === 'duration' ? 's or m:ss' : metricCatalogue[metric.key].unit;
  return `${metricLabel(metric.key, metric)}${unit ? ` (${unit})` : ''}`;
}
export function targetLine(exercise: Pick<SessionExercise, 'metrics'>, target: RoundTargets | undefined) {
  if (!target) {
    return 'Any';
  }
  const metrics = exercise.metrics.map(
    (metric) => `${metricLabel(metric.key, metric)} ${formatTarget(metric.key, target[metric.key])}`,
  );
  if (target.grade) {
    metrics.push(`Grade ${formatTarget('grade', target.grade)}`);
  }
  return [...metrics, `Rest ${formatRest(target.rest)}`].join(' · ');
}
export type RestDraft = {mode: RestTarget['mode']; value: string; min: string; max: string};
export const restDraft = (rest: RestTarget): RestDraft => ({
  mode: rest.mode,
  value: String(rest.value_s ?? ''),
  min: String(rest.min_s ?? ''),
  max: String(rest.max_s ?? ''),
});
export function restBody(draft: RestDraft): RestTarget | null {
  if (draft.mode === 'none' || draft.mode === 'client_chooses') {
    return {mode: draft.mode};
  }
  const value = parseMeasurement('duration', draft.value);
  const min = parseMeasurement('duration', draft.min);
  const max = parseMeasurement('duration', draft.max);
  if (draft.mode === 'exact') {
    return value.ok && typeof value.value === 'number' ? {mode: 'exact', value_s: value.value} : null;
  }
  return min.ok && max.ok && typeof min.value === 'number' && typeof max.value === 'number' && min.value <= max.value
    ? {mode: 'range', min_s: min.value, max_s: max.value}
    : null;
}

export function feedbackBody(
  log: {effort: number | null; pain: boolean | null; text: string | null},
  input: {effort: string; pain: string; text: string},
): SessionFeedback {
  const body: SessionFeedback = {};
  if (input.effort) {
    body.effort = Number(input.effort);
  }
  if (input.pain) {
    body.pain = input.pain === 'yes';
  }
  if (input.text !== (log.text ?? '')) {
    body.text = input.text.trim() || null;
  }
  return body;
}
export function planTargets(
  source: Pick<SessionEntry, 'exercise' | 'targets'> | null | undefined,
  rests: readonly (RestTarget | null)[],
): RoundTargets[] {
  return rests.map((rest, index) => {
    const target: RoundTargets = {rest: rest ?? {mode: 'client_chooses'}};
    for (const metric of source?.exercise.metrics ?? []) {
      const value = source?.targets[index]?.[metric.key];
      if (value) {
        target[metric.key] = value;
      }
    }
    return target;
  });
}
export const restModes = ['client_chooses', 'none', 'exact', 'range'] as const;

export function selectedActivity<A>(row: {current: A | null; activities: readonly A[]}): A | undefined {
  return row.current ?? row.activities.at(-1);
}

export function roundsFor<E extends RecordingEntry, A extends SessionActivity>(
  workout: RecordingWorkout<E>,
  row: RecordingRow<E, A>,
): number {
  return (
    selectedActivity(row)?.rounds ??
    workout.groups.find((group) => group.exercises.some((entry) => entry.id === row.entry?.id))?.rounds ??
    1
  );
}

export function hasRecordedWork(activity: (SessionActivity & MeasurementBody) | undefined): boolean {
  return Boolean(
    activity &&
      (activity.state === 'completed' ||
        activity.sets.some((set) => set.state === 'completed') ||
        Object.values(measurementFields).some(
          (field) => field && field.scope !== 'detail' && activity[field.field] != null,
        )),
  );
}

export function slotModel<E extends SessionEntry, A extends SessionActivity, X extends SessionExercise>(
  log: RecordingLog<A>,
  row: RecordingRow<E, A>,
  slot: Slot,
  draft: WorkoutDraft,
  fallback: X,
) {
  const selected = selectedActivity(row);
  const source = row.entry ? {id: row.entry.id, workout_exercise_id: row.entry.id} : selected;
  if (!source) {
    return null;
  }
  const view = slotView(log, source, slot);
  const exercise: A['exercise'] | X = view.activity?.exercise ?? fallback;
  const sourceId = row.entry?.id ?? selected?.id ?? '';
  const key = view.set ? `set.${view.set.id}` : slotInputKey(sourceId, exercise.id, slot);
  const inputs = draft.inputs[key] ?? {};
  const body = measurementBody(exercise, inputs, 'detail', view.set !== null);
  const label = `${slot.round}${slot.side ? ` ${slot.side}` : ''}`;
  const name = `${exercise.name} set ${label}`;
  const instructions = view.activity ?? selected;
  const targets = instructions?.targets ?? row.entry?.targets ?? [];
  const mode = instructions?.targets_mode ?? row.entry?.targets_mode ?? 'same_for_all';
  const target = targets[mode === 'same_for_all' ? 0 : slot.round - 1];
  return {selected, view, exercise, key, inputs, body, label, name, target};
}

export function planDraft(row: SessionRow, rounds: string, rests: readonly RestDraft[]) {
  const selected = selectedActivity(row);
  const source = selected ?? row.entry;
  const initialRounds = selected?.rounds ?? row.slots.at(-1)?.round ?? 1;
  const mode = source?.targets_mode ?? 'same_for_all';
  const count = Number(rounds);
  const minimum = row.activities.reduce(
    (highest, activity) => activity.sets.reduce((recorded, set) => Math.max(recorded, set.round), highest),
    1,
  );
  const validCount = Number.isInteger(count) && count >= minimum && count <= 10_000;
  const total = mode === 'same_for_all' ? 1 : validCount ? count : initialRounds;
  const normalized = Array.from(
    {length: total},
    (_, index) => rests[index] ?? restDraft(source?.targets[index]?.rest ?? {mode: 'client_chooses'}),
  );
  const bodies = normalized.map(restBody);
  const valid = validCount && bodies.every((body) => body !== null);
  const body: ActivityUpdate | null = valid
    ? {rounds: count, targets_mode: mode, targets: planTargets(source, bodies)}
    : null;
  return {mode, initialRounds, minimum, rests: normalized, valid, body};
}

export function prepareActivity(
  log: SessionLog,
  row: SessionRow,
  createId: () => string,
): {id: string; commands: SessionOperation[]} | null {
  const selected = selectedActivity(row);
  if (selected) {
    return {id: selected.id, commands: []};
  }
  if (!row.entry) {
    return null;
  }
  const id = createId();
  const command: SessionOperation = {
    action: 'startActivity',
    id: log.id,
    body: {id, exercise_id: row.entry.exercise_id, workout_exercise_id: row.entry.id},
  };
  return {id, commands: [command]};
}
export function slotCommands(
  log: SessionLog,
  row: SessionRow,
  slot: Slot,
  state: 'completed' | 'skipped',
  body: MeasurementBody,
  createId: () => string,
): SessionOperation[] {
  const selected = selectedActivity(row);
  const source = row.entry ? {id: row.entry.id, workout_exercise_id: row.entry.id} : selected;
  if (!source) {
    return [];
  }
  const saved = slotView(log, source, slot);
  if (saved.set && saved.activity) {
    return [
      {action: 'correctSet', id: log.id, activityId: saved.activity.id, setId: saved.set.id, body: {state, ...body}},
    ];
  }
  const prepared = prepareActivity(log, row, createId);
  return prepared
    ? [
        ...prepared.commands,
        {
          action: 'recordSet',
          id: log.id,
          activityId: prepared.id,
          body: {id: createId(), state, round: slot.round, side: slot.side, ...body},
        },
      ]
    : [];
}
export function activityCommands(
  log: SessionLog,
  row: SessionRow,
  body: ActivityUpdate,
  createId: () => string,
): SessionOperation[] {
  const prepared = prepareActivity(log, row, createId);
  return prepared ? [...prepared.commands, {action: 'updateActivity', id: log.id, activityId: prepared.id, body}] : [];
}
export function outcomeCommands(
  log: SessionLog,
  row: SessionRow,
  action: 'completeActivity' | 'skipActivity' | 'reopenActivity',
  createId: () => string,
): SessionOperation[] {
  const prepared = prepareActivity(log, row, createId);
  if (!prepared) {
    return [];
  }
  const command: SessionOperation =
    action === 'completeActivity'
      ? {action, id: log.id, activityId: prepared.id, body: {}}
      : {action, id: log.id, activityId: prepared.id};
  return [...prepared.commands, command];
}
export function swapCommands(
  log: SessionLog,
  row: SessionRow,
  exerciseId: string,
  createId: () => string,
): SessionOperation[] {
  const selected = selectedActivity(row);
  const id = createId();
  if (selected) {
    return [{action: 'replaceActivity', id: log.id, activityId: selected.id, body: {id, exercise_id: exerciseId}}];
  }
  return row.entry
    ? [{action: 'startActivity', id: log.id, body: {id, exercise_id: exerciseId, workout_exercise_id: row.entry.id}}]
    : [];
}
export function finishCommands(log: SessionLog, feedback: SessionFeedback): SessionOperation[] {
  const commands: SessionOperation[] = [];
  if (Object.keys(feedback).length) {
    commands.push({action: 'update', id: log.id, body: feedback});
  }
  return [...commands, {action: 'finish', id: log.id, body: {}}];
}

function responseStatus(cause: unknown): number | null {
  return cause !== null && typeof cause === 'object' && 'status' in cause && typeof cause.status === 'number'
    ? cause.status
    : null;
}
function isRejected(cause: unknown): boolean {
  const status = responseStatus(cause);
  return status !== null && status >= 400 && status < 500;
}
function actionError(cause: unknown, fallback: string): string {
  const status = responseStatus(cause);
  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (status !== null && status >= 500) {
    return 'We could not reach the service. Please try again shortly.';
  }
  return status !== null && cause instanceof Error ? cause.message || fallback : fallback;
}

type ControllerOptions<L extends SessionLog> = {
  getLog: () => L | null;
  getDraft: () => WorkoutDraft | null;
  isCurrent: () => boolean;
  writeDraft: (draft: WorkoutDraft, durable: boolean) => Promise<boolean>;
  execute: (operation: SessionOperation) => Promise<{data: L}>;
  reload: (id: string) => Promise<{data: L}>;
  setLog: (log: L) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  createId: () => string;
  onAcknowledged?: (operation: SessionOperation, log: L) => void;
  onSaved?: () => void;
};

// Adapters supply transport and storage; this workflow owns command order and retry identity.
export function createRecordingController<L extends SessionLog>(options: ControllerOptions<L>) {
  const createId = options.createId;
  let busy = false;
  const inputWrites = new Set<Promise<boolean>>();
  const setBusy = (next: boolean) => {
    busy = next;
    options.setBusy(next);
  };
  const persist = async (draft: WorkoutDraft) => {
    if (!(await options.writeDraft(draft, true)) || !options.isCurrent()) {
      throw new Error('The action could not be kept on this device. Try again.');
    }
  };
  const runPending = async (draft: WorkoutDraft) => {
    let current = draft;
    options.setError('');
    try {
      while (current.pending) {
        const command = current.pending.commands[0];
        if (!command) {
          break;
        }
        const result = await options.execute(command);
        if (!options.isCurrent()) {
          return;
        }
        options.setLog(result.data);
        const next = acknowledgeCommand(current);
        await persist(next);
        current = next;
        options.onAcknowledged?.(command, result.data);
      }
      options.onSaved?.();
    } catch (cause) {
      if (!options.isCurrent()) {
        return;
      }
      if (isRejected(cause)) {
        const id = options.getLog()?.id;
        if (id) {
          try {
            const result = await options.reload(id);
            options.setLog(result.data);
          } catch {
            /* Keep the last saved view when refresh fails. */
          }
        }
        try {
          await persist({...current, pending: null});
          options.setError(
            `${actionError(cause, 'This action was rejected.')} Review the values and save again. Your inputs are kept.`,
          );
        } catch {
          options.setError('The device draft could not be updated. Your action is kept. Retry saving.');
        }
      } else {
        options.setError(
          `${actionError(cause, 'Could not save this action.')} Your action stays on this device. Retry saving.`,
        );
      }
    }
  };
  const commit = async (commands: SessionOperation[], clearInputs: string[] = []) => {
    if (!options.isCurrent() || busy || options.getDraft()?.pending || !commands.length) {
      return;
    }
    setBusy(true);
    try {
      await Promise.all(inputWrites);
      const next = queueCommands(options.getDraft() ?? emptyWorkoutDraft(), commands, clearInputs);
      await persist(next);
      await runPending(next);
    } catch {
      options.setError('The action could not be kept on this device. Try saving again.');
    } finally {
      setBusy(false);
    }
  };
  const withLog = (commands: (log: L) => SessionOperation[], clearInputs: string[] = []) => {
    const log = options.getLog();
    if (log) {
      return commit(commands(log), clearInputs);
    }
  };
  return {
    isBusy: () => busy,
    commit,
    flushInputs: () => Promise.all(inputWrites),
    input(key: string, metric: MetricKey, value: string) {
      const draft = options.getDraft();
      if (!options.isCurrent() || !draft || busy || draft.pending) {
        return;
      }
      const next = {...draft, inputs: {...draft.inputs, [key]: {...draft.inputs[key], [metric]: value}}};
      const write = options.writeDraft(next, false);
      inputWrites.add(write);
      write.finally(() => inputWrites.delete(write));
    },
    async retry() {
      const draft = options.getDraft();
      if (!options.isCurrent() || !draft || busy) {
        return;
      }
      setBusy(true);
      try {
        const id = options.getLog()?.id;
        if (id) {
          const result = await options.reload(id);
          options.setLog(result.data);
        }
        await runPending(draft);
      } catch {
        options.setError('Could not refresh the saved session. Your action is kept. Retry saving.');
      } finally {
        setBusy(false);
      }
    },
    saveSlot: (row: SessionRow, slot: Slot, state: 'completed' | 'skipped', body: MeasurementBody, key: string) =>
      withLog((log) => slotCommands(log, row, slot, state, body, createId), [key]),
    saveActivity: (row: SessionRow, body: ActivityUpdate, key?: string) =>
      withLog((log) => activityCommands(log, row, body, createId), key ? [key] : []),
    activityOutcome: (row: SessionRow, action: 'completeActivity' | 'skipActivity' | 'reopenActivity') =>
      withLog((log) => outcomeCommands(log, row, action, createId)),
    copyTargets: (row: SessionRow) => {
      const selected = selectedActivity(row);
      const entry = row.entry;
      if (entry && selected) {
        return withLog((log) => activityCommands(log, row, copyTargets(entry, selected), createId));
      }
    },
    swap: (row: SessionRow, exerciseId: string) => withLog((log) => swapCommands(log, row, exerciseId, createId)),
    addActivity: (exerciseId: string) =>
      withLog((log) => [{action: 'startActivity', id: log.id, body: {id: createId(), exercise_id: exerciseId}}]),
    removeSet: (activityId: string, setId: string) =>
      withLog((log) => [{action: 'removeSet', id: log.id, activityId, setId}]),
    finish: (feedback: SessionFeedback) =>
      withLog((log) => finishCommands(log, feedback), Object.keys(options.getDraft()?.inputs ?? {})),
    reopen: () => withLog((log) => [{action: 'reopen', id: log.id}]),
    discard: () => withLog((log) => [{action: 'discard', id: log.id}], Object.keys(options.getDraft()?.inputs ?? {})),
  };
}
