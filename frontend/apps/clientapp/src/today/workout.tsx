import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {type ClientDay, useClientDay} from '../api/client-days';
import {getSession} from '../api/session';
import {useWorkoutLog, type WorkoutLog} from '../api/workout-logs';
import {useCoaching} from '../ui/coaching';
import {DraftStatus} from '../ui/draft-status';
import {Page} from '../ui/page';
import {ReadState} from '../ui/read-state';
import {useUndoMessage} from '../ui/undo-message';
import {dayName, nowTime} from './model';
import {useWorkoutRecording} from './use-workout-recording';
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
  const initial =
    detail.data?.data ??
    day.data.data.workout_logs.find(
      (log) => log.schedule_id === scheduleId && log.scheduled_date === date && log.state !== 'discarded',
    ) ??
    null;
  return (
    <WorkoutEditor
      key={`${getSession()?.id}.${date}.${scheduleId}`}
      day={day.data.data}
      scheduleId={scheduleId}
      initial={initial}
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
  initial: WorkoutLog | null;
  canWrite: boolean;
}) {
  const navigate = useNavigate();
  const show = useUndoMessage();
  const schedule = day.workout_schedules.find((row) => row.id === scheduleId);
  const back = () => navigate(`/?date=${day.date}`, {state: {focus: `card-${scheduleId}`}});
  const {local, busy, error, durable, session} = useWorkoutRecording({
    initial,
    resource: `workout-recording.${day.date}.${scheduleId}`,
    onAcknowledged: (command) => {
      if (command.action === 'finish' || command.action === 'discard') {
        show({text: command.action === 'finish' ? 'Workout saved. Your coach can see it.' : 'Workout discarded.'});
        back();
      }
    },
  });
  const workout = day.workouts.find((row) => row.id === (local?.workout_id ?? schedule?.workout_id));
  if (!workout) {
    return (
      <Page
        title="Workout unavailable"
        back={`/?date=${day.date}`}
      >
        <p>Return to the day and try again.</p>
      </Page>
    );
  }
  if (!durable.draft) {
    return (
      <Page
        title={workout.name}
        back={`/?date=${day.date}`}
      >
        <p role="status">Opening your device draft…</p>
      </Page>
    );
  }
  const readOnly = !canWrite || day.date > day.today;
  return (
    <WorkoutLogger
      workout={workout}
      log={local}
      date={day.date}
      time={schedule?.time ?? null}
      back={dayName(day.date, day.today)}
      readOnly={readOnly}
      canStart={!readOnly && (!day.active_workout || day.active_workout.id === local?.id)}
      startBlockedReason={
        day.date > day.today
          ? 'You can start this on the day.'
          : day.active_workout
            ? 'Finish your workout in progress first.'
            : 'This workout is available to read.'
      }
      pending={busy}
      blocked={Boolean(durable.draft.pending)}
      draft={durable.draft}
      error={error || durable.loadError}
      draftStatus={<DraftStatus state={durable.state} />}
      onClose={async () => {
        await session.flushInputs();
        back();
      }}
      onInput={session.input}
      onRetry={session.retry}
      onStart={() =>
        session.commit([
          {
            action: 'start',
            body: {
              id: crypto.randomUUID(),
              date: day.date,
              time: nowTime(),
              workout_id: workout.id,
              ...(schedule ? {schedule_id: schedule.id, scheduled_date: day.date} : {}),
            },
          },
        ])
      }
      onSaveSlot={session.saveSlot}
      onSaveOverall={session.saveActivity}
      onSavePlan={session.saveActivity}
      onCopyTargets={session.copyTargets}
      onActivityOutcome={session.activityOutcome}
      onSwap={session.swap}
      onAddActivity={session.addActivity}
      onRemoveSet={session.removeSet}
      onFinish={session.finish}
      onReopen={session.reopen}
      onDiscard={session.discard}
    />
  );
}
