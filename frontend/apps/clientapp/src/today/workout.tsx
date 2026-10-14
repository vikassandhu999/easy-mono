import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {type ClientDay, useClientDay} from '../api/client-days';
import {removeDraft} from '../api/drafts';
import {getSession} from '../api/session';
import type {WorkoutLog as ApiWorkoutLog} from '../api/workout-logs';
import {useWorkoutLog, useWriteWorkout, type WorkoutUpdate} from '../api/workout-logs';
import {useCoaching} from '../ui/coaching';
import {Confirm} from '../ui/confirm';
import {DraftStatus} from '../ui/draft-status';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {useUndoMessage} from '../ui/undo-message';
import {useDurableDraft} from '../ui/use-durable-draft';
import {
  asWorkout,
  asWorkoutLog,
  dayName,
  nowTime,
  parseWorkoutDraft,
  pendingSetCorrections,
  setInput,
  type WorkoutLog,
} from './model';
import {WorkoutLogger} from './workout-logger';

export function Workout() {
  const {date = '', scheduleId = ''} = useParams();
  const [params] = useSearchParams();
  const day = useClientDay(date);
  const detail = useWorkoutLog(params.get('log') ?? '');
  const {canWrite} = useCoaching();
  if (!day.data) {
    return (
      <Page
        title="Opening your workout"
        back={`/?date=${date}`}
      >
        <ReadState
          label="your workout"
          failed={day.isError}
          retry={() => {
            day.refetch();
          }}
        />
      </Page>
    );
  }
  const row =
    detail.data?.data ??
    day.data.data.workout_logs.find(
      (log) => log.schedule_id === scheduleId && log.scheduled_date === date && log.state !== 'discarded',
    ) ??
    null;
  return (
    <WorkoutEditor
      key={`${scheduleId}.${row?.id ?? 'preview'}`}
      day={day.data.data}
      scheduleId={scheduleId}
      initial={row}
      canWrite={canWrite}
    />
  );
}
function WorkoutEditor({
  day,
  scheduleId,
  initial,
  canWrite,
}: {
  day: ClientDay;
  scheduleId: string;
  initial: ApiWorkoutLog | null;
  canWrite: boolean;
}) {
  const nav = useNavigate();
  const show = useUndoMessage();
  const schedule = day.workout_schedules.find((row) => row.id === scheduleId);
  const rawWorkout = day.workouts.find((row) => row.id === (initial?.workout_id ?? schedule?.workout_id));
  const write = useWriteWorkout();
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<WorkoutUpdate | null>(null);
  const queue = useRef(Promise.resolve());
  const failedRef = useRef<WorkoutUpdate | null>(null);
  const pendingUpdates = useRef(0);
  const [leaving, setLeaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const resource = `workout.${initial?.id ?? `${scheduleId}.${day.date}`}`;
  const durable = useDurableDraft({
    initial: {inputs: {}, extraRounds: {}},
    resource,
    parse: parseWorkoutDraft,
    label: 'workout',
  });
  const [local, setLocal] = useState<WorkoutLog | null>(() => (initial ? asWorkoutLog(initial) : null));
  const localRef = useRef(local);
  localRef.current = local;
  useEffect(() => {
    if (initial && pendingUpdates.current === 0 && !failedRef.current) {
      setLocal(asWorkoutLog(initial));
    }
  }, [initial]);
  const back = () => nav(`/?date=${day.date}`, {state: {focus: `card-${scheduleId}`}});
  if (!rawWorkout) {
    return (
      <Page
        title="Workout unavailable"
        back={`/?date=${day.date}`}
      >
        <p>This workout could not be opened. Return to the day and try again.</p>
      </Page>
    );
  }
  if (!durable.draft) {
    return (
      <Page
        title={rawWorkout.name}
        back={`/?date=${day.date}`}
      >
        <ReadState
          label="your device draft"
          failed={Boolean(durable.loadError)}
          retry={() => {
            nav(0);
          }}
        />
        {durable.loadError && <p role="alert">{durable.loadError}</p>}
      </Page>
    );
  }
  const log = local ? {...local, ...(local.state === 'active' ? durable.draft : {inputs: {}, extraRounds: {}})} : null;
  const correction = log ? pendingSetCorrections(log, asWorkout(rawWorkout)) : {sets: [], pending: false};
  const coach = day.coaches.find((row) => row.id === schedule?.coach_id)?.name;
  const readOnly = !canWrite || day.date > day.today || Boolean(coach);
  const enqueueUpdate = (
    next: WorkoutLog,
    beforeDraft: {inputs: WorkoutLog['inputs']; extraRounds: WorkoutLog['extraRounds']},
  ) => {
    const draft = {inputs: next.inputs, extraRounds: next.extraRounds};
    const body: WorkoutUpdate = {
      sets: next.sets.map(setInput),
      swaps: Object.fromEntries(Object.entries(next.swaps).map(([id, exercise]) => [id, exercise.id])),
    };
    setError('');
    pendingUpdates.current++;
    queue.current = queue.current.then(async () => {
      try {
        const result = await write.mutateAsync({action: 'update', id: next.id, body});
        if ('data' in result) {
          if (localRef.current === next) {
            setLocal(asWorkoutLog(result.data, draft));
          }
          setFailed(null);
          failedRef.current = null;
        }
        if ('undo_token' in result) {
          show({
            text: 'Workout updated.',
            undo: async () => {
              const restored = await write.mutateAsync({action: 'restore', token: result.undo_token});
              if ('data' in restored) {
                const changedKeys = new Set(
                  [...Object.keys(beforeDraft.inputs), ...Object.keys(next.inputs)].filter(
                    (key) => JSON.stringify(beforeDraft.inputs[key]) !== JSON.stringify(next.inputs[key]),
                  ),
                );
                await durable.update((current) => {
                  const inputs = {...current.inputs};
                  for (const key of changedKeys) {
                    const previous = beforeDraft.inputs[key];
                    if (previous) {
                      inputs[key] = previous;
                    } else {
                      delete inputs[key];
                    }
                  }
                  return {...current, inputs};
                }, true);
                setLocal(asWorkoutLog(restored.data, beforeDraft));
              }
            },
          });
        }
      } catch (cause) {
        setFailed(body);
        failedRef.current = body;
        setError(
          `${errorMessage(cause, 'Could not save this set.')} Your changes stay on this device. Retry before leaving this screen.`,
        );
      } finally {
        pendingUpdates.current--;
      }
    });
  };
  const saveChange = (next: WorkoutLog) => {
    if (transitioning) {
      return;
    }
    const beforeDraft = {inputs: log?.inputs ?? {}, extraRounds: log?.extraRounds ?? {}};
    const draft = {inputs: next.inputs, extraRounds: next.extraRounds};
    durable.update(() => draft);
    if (!log || readOnly) {
      return;
    }
    if (next.state !== log.state) {
      setTransitioning(true);
      pendingUpdates.current++;
      write
        .mutateAsync({action: 'reopen', id: log.id})
        .then((result) => {
          if ('data' in result) {
            setLocal(asWorkoutLog(result.data, draft));
          }
          if ('undo_token' in result) {
            show({
              text: 'Workout reopened.',
              undo: async () => {
                const restored = await write.mutateAsync({action: 'restore', token: result.undo_token});
                if ('data' in restored) {
                  setLocal(asWorkoutLog(restored.data, durable.draft ?? draft));
                }
              },
            });
          }
        })
        .catch((cause) => setError(errorMessage(cause, 'Could not reopen. Try Edit again.')))
        .finally(() => {
          pendingUpdates.current--;
          setTransitioning(false);
        });
      return;
    }
    const body: WorkoutUpdate = {
      sets: next.sets.map(setInput),
      swaps: Object.fromEntries(Object.entries(next.swaps).map(([id, exercise]) => [id, exercise.id])),
    };
    const previous = JSON.stringify({
      sets: log.sets.map(setInput),
      swaps: Object.fromEntries(Object.entries(log.swaps).map(([id, exercise]) => [id, exercise.id])),
    });
    if (JSON.stringify(body) === previous) {
      if (JSON.stringify(beforeDraft.extraRounds) !== JSON.stringify(draft.extraRounds)) {
        show({text: 'Set added.', undo: () => durable.update(() => beforeDraft, true)});
      }
      return;
    }
    setLocal(next);
    enqueueUpdate(next, beforeDraft);
  };
  const requestBack = async () => {
    if (transitioning) {
      return;
    }
    await queue.current;
    if (failedRef.current || correction.pending) {
      setLeaving(true);
    } else {
      back();
    }
  };
  const perform = async (action: 'finish' | 'discard' | 'delete', next: WorkoutLog) => {
    if (transitioning) {
      return;
    }
    setTransitioning(true);
    pendingUpdates.current++;
    setError('');
    await queue.current;
    try {
      if (action === 'finish' && (next.difficulty === null || next.pain === null)) {
        setError('Answer how hard it was and whether anything hurt.');
        return;
      }
      const result =
        action === 'finish'
          ? await write.mutateAsync({
              action: 'finish',
              id: next.id,
              body: {
                sets: next.sets.map(setInput),
                swaps: Object.fromEntries(Object.entries(next.swaps).map(([id, exercise]) => [id, exercise.id])),
                difficulty: next.difficulty as 'too_easy' | 'just_right' | 'too_hard',
                pain: next.pain as boolean,
                pain_note: next.painNote,
              },
            })
          : await write.mutateAsync({action, id: next.id});
      if (action === 'finish') {
        await durable.update(() => ({inputs: {}, extraRounds: {}}), true);
        const owner = getSession()?.id;
        if (owner) {
          try {
            await removeDraft(owner, resource);
          } catch {
            show({text: 'Workout saved. The device draft could not be cleared.'});
          }
        }
      }
      show({
        text:
          action === 'finish'
            ? 'Workout saved. Your coach can see it.'
            : action === 'discard'
              ? 'Workout discarded.'
              : 'Workout deleted.',
        ...('undo_token' in result
          ? {undo: () => write.mutateAsync({action: 'restore', token: result.undo_token})}
          : {}),
      });
      back();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not save. Check your connection and try again.'));
    } finally {
      pendingUpdates.current--;
      setTransitioning(false);
    }
  };
  return (
    <>
      <WorkoutLogger
        workout={asWorkout(rawWorkout)}
        log={log}
        date={day.date}
        time={schedule?.time ?? null}
        coach={coach}
        back={dayName(day.date, day.today)}
        canStart={!readOnly && !day.active_workout}
        readOnly={readOnly}
        startBlockedReason={
          day.active_workout ? 'Finish your workout in progress first.' : 'You can start this on the day.'
        }
        pending={write.isPending || transitioning}
        locked={transitioning}
        blocked={Boolean(failed) || correction.pending}
        error={
          error ||
          (correction.pending
            ? 'Your recorded set changes were not saved. Your inputs stay on this device. Retry saving sets or restore the saved values.'
            : '')
        }
        draftStatus={<DraftStatus state={durable.state} />}
        onRetry={() => {
          const next = localRef.current;
          if (next) {
            const displayed = {...next, ...durable.draft};
            const intended = {...displayed, sets: pendingSetCorrections(displayed, asWorkout(rawWorkout)).sets};
            setLocal(intended);
            localRef.current = intended;
            enqueueUpdate(intended, {inputs: next.inputs, extraRounds: next.extraRounds});
          }
        }}
        onStart={async () => {
          setError('');
          try {
            const result = await write.mutateAsync({
              action: 'start',
              body: {
                date: day.date,
                time: nowTime(),
                workout_id: rawWorkout.id,
                ...(schedule ? {schedule_id: schedule.id, scheduled_date: day.date} : {}),
              },
            });
            if ('data' in result) {
              const id = result.data.id;
              show({
                text: 'Workout started.',
                undo: async () => {
                  await write.mutateAsync({action: 'delete', id});
                  const owner = getSession()?.id;
                  if (owner) {
                    await removeDraft(owner, `workout.${id}`);
                  }
                },
              });
            }
          } catch (cause) {
            setError(errorMessage(cause, 'Could not start. Try again.'));
          }
        }}
        onChange={saveChange}
        onFinish={(next) => perform('finish', next)}
        onDiscard={(next) => perform('discard', next)}
        onDelete={(next) => perform('delete', next)}
        onClose={requestBack}
      />
      {leaving && (
        <Confirm
          title="Leave without saving?"
          action="Leave without saving"
          cancel="Keep going"
          destructive
          pending={false}
          onClose={() => setLeaving(false)}
          onConfirm={back}
        >
          This set was not saved. Your typed values stay on this device. The set will be unticked when you return.
        </Confirm>
      )}
    </>
  );
}
