import {type ReactNode, useEffect, useState} from 'react';
import {generatePath, Link} from 'react-router-dom';
import type {ScheduleUpdate, WorkoutSchedule, WorkoutWeek} from '../api/workout-week';
import {useWorkouts, type Workout} from '../api/workouts';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {type Day, daysLabel} from '../ui/week';
import {EditDialog, fieldClass, SearchField, WeekdayPicker} from '../ui/week-editor';
import {occasionOf, type SaveIntent} from './model';

type Apply = (intent: SaveIntent) => Promise<boolean>;
function validMeetingUrl(value: string | null | undefined) {
  if (!value) {
    return true;
  }
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function ScheduleDialog({
  clientId,
  state,
  schedule,
  day,
  apply,
  pending,
  blocked,
  recovery,
  onClose,
}: {
  clientId: string;
  state: WorkoutWeek;
  schedule: WorkoutSchedule;
  day: Day;
  apply: Apply;
  pending: boolean;
  blocked: boolean;
  recovery: ReactNode;
  onClose: () => void;
}) {
  const [body, setBody] = useState<ScheduleUpdate>({...occasionOf(schedule), weekdays_mask: schedule.weekdays_mask});
  const workout = state.workouts.find((row) => row.id === schedule.workout_id);
  const name = workout?.name ?? 'Workout';
  const [leaving, setLeaving] = useState(false);
  const [urlBlurred, setUrlBlurred] = useState(false);
  const urlValid = validMeetingUrl(body.meeting_url);
  const dirty =
    JSON.stringify(body) !== JSON.stringify({...occasionOf(schedule), weekdays_mask: schedule.weekdays_mask});
  const close = () => {
    if (dirty) {
      setLeaving(true);
    } else {
      onClose();
    }
  };
  const commit = async (intent: SaveIntent) => {
    if (await apply(intent)) {
      onClose();
    }
  };
  return (
    <EditDialog
      title={name}
      dirty={dirty}
      pending={pending}
      canClose={!blocked}
      recovery={recovery}
      onClose={close}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            isPending={pending}
            isDisabled={blocked || !body.weekdays_mask || !urlValid || Boolean(body.place && body.meeting_url)}
            onPress={() => commit({kind: 'schedule', before: state, id: schedule.id, body, message: `${name} saved.`})}
          >
            Save
          </Button>
          {!blocked && !pending && (
            <Link
              className={buttonVariants({variant: 'outline'})}
              to={generatePath(routes.clientWorkout, {id: clientId, workoutId: schedule.workout_id})}
            >
              Edit workout
            </Link>
          )}
          <Button
            variant="ghost"
            className="text-destructive"
            isDisabled={pending || blocked}
            onPress={() =>
              commit({
                kind: 'remove',
                before: state,
                id: schedule.id,
                weekday: day.number,
                message: `${name} removed from ${day.long}.`,
              })
            }
          >
            Remove from {day.long}
          </Button>
        </div>
      }
    >
      {leaving ? (
        <div className="space-y-3">
          <p>Your changes are not saved. Discard them?</p>
          <Button onPress={() => setLeaving(false)}>Keep editing</Button>
          <Button
            variant="outline"
            onPress={onClose}
          >
            Discard changes
          </Button>
        </div>
      ) : (
        <>
          {workout?.description && <p className="text-sm font-medium text-muted-foreground">{workout.description}</p>}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Every week on</legend>
            <WeekdayPicker
              mask={body.weekdays_mask ?? 0}
              onChange={(weekdays_mask) => setBody({...body, weekdays_mask})}
            />
            <p className="text-sm font-medium text-muted-foreground">
              {body.weekdays_mask ? daysLabel(body.weekdays_mask) : 'Choose at least one day.'}
            </p>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Live session (optional)</legend>
            <label
              htmlFor="week-time"
              className="grid gap-1 text-sm font-medium"
            >
              Time
              <Input
                id="week-time"
                type="time"
                value={body.time?.slice(0, 5) ?? ''}
                onChange={(event) => setBody({...body, time: event.target.value || null})}
                className={fieldClass}
              />
            </label>
            <label
              htmlFor="week-place"
              className="grid gap-1 text-sm font-medium"
            >
              Place
              <Input
                id="week-place"
                value={body.place ?? ''}
                onChange={(event) => setBody({...body, place: event.target.value || null, meeting_url: null})}
                className={fieldClass}
              />
            </label>
            <label
              htmlFor="week-url"
              className="grid gap-1 text-sm font-medium"
            >
              Meeting URL
              <Input
                id="week-url"
                type="url"
                aria-invalid={urlBlurred && !urlValid}
                aria-describedby="week-url-help"
                onBlur={() => setUrlBlurred(true)}
                value={body.meeting_url ?? ''}
                onChange={(event) => setBody({...body, meeting_url: event.target.value || null, place: null})}
                className={fieldClass}
              />
              <span
                id="week-url-help"
                className="text-sm font-medium text-muted-foreground"
              >
                {urlBlurred && !urlValid
                  ? 'Use a URL that starts with https:// or http://.'
                  : 'Use a place or a meeting URL.'}
              </span>
            </label>
            <div className="space-y-1">
              <label
                id="week-coach-label"
                htmlFor="week-coach"
                className="text-sm font-medium"
              >
                Coach who leads
              </label>
              <SelectField
                id="week-coach"
                value={body.coach_id ?? ''}
                onChange={(coach_id) => setBody({...body, coach_id: coach_id || null})}
              >
                <SelectItem
                  id=""
                  textValue="Nobody, client trains alone"
                >
                  Nobody, client trains alone
                </SelectItem>
                {state.coaches.map((coach) => (
                  <SelectItem
                    key={coach.id}
                    id={coach.id}
                    textValue={coach.name}
                  >
                    {coach.name}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          </fieldset>
          <p className="text-sm font-medium text-muted-foreground">
            Changes apply from today. Earlier weeks stay as they were.
          </p>
        </>
      )}
    </EditDialog>
  );
}

export function AddDialog({
  clientId,
  state,
  day,
  apply,
  pending,
  blocked,
  recovery,
  onClose,
}: {
  clientId: string;
  state: WorkoutWeek;
  day: Day;
  apply: Apply;
  pending: boolean;
  blocked: boolean;
  recovery: ReactNode;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSubmitted(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const clientWorkouts = useWorkouts({search: submitted}, clientId);
  const library = useWorkouts({search: submitted});
  const pick = async (workout: Workout, fromLibrary: boolean) => {
    const result = await apply({
      kind: 'add',
      before: state,
      body: {weekdays_mask: day.bit, ...(fromLibrary ? {library_workout_id: workout.id} : {workout_id: workout.id})},
      ...(fromLibrary ? {library: workout} : {}),
      message: `${workout.name} added to ${day.long}.`,
    });
    if (result) {
      onClose();
    }
  };
  const row = (workout: Workout, fromLibrary: boolean) => (
    <Button
      variant="ghost"
      isDisabled={pending || blocked}
      className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
      onPress={() => pick(workout, fromLibrary)}
    >
      <span className="font-semibold">{workout.name}</span>
      <span className="text-sm font-medium text-muted-foreground">
        {workout.type === 'open' ? 'Open session' : workout.type === 'video' ? 'Video workout' : 'Prescribed workout'}
        {workout.description ? ` · ${workout.description}` : ''}
      </span>
    </Button>
  );
  return (
    <EditDialog
      title={`Add to ${day.long}`}
      dirty={false}
      pending={pending}
      canClose={!blocked}
      recovery={recovery}
      onClose={onClose}
    >
      <SearchField
        label="Search workouts"
        value={search}
        onChange={setSearch}
      />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">This client’s workouts</h3>
        <InfiniteList
          query={clientWorkouts}
          label="client workouts"
          singular="workout"
          empty={<p className="text-sm font-medium text-muted-foreground">No matching client workouts.</p>}
        >
          {(workout) => row(workout, false)}
        </InfiniteList>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">From your library (a copy is made)</h3>
        <InfiniteList
          query={library}
          label="library workouts"
          singular="workout"
          empty={<p className="text-sm font-medium text-muted-foreground">No matching library workouts.</p>}
        >
          {(workout) => row(workout, true)}
        </InfiniteList>
      </section>
    </EditDialog>
  );
}
