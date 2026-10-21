// PROTOTYPE — throwaway. Dialogs for the repeating-week editor.
import {useState} from 'react';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {
  actions,
  type ClientWorkout,
  daysLabel,
  library,
  type Occasion,
  pick,
  type Schedule,
  type State,
  weekdays,
  workoutOf,
} from './model';

export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20';

export function WeekdayPicker({mask, onChange}: {mask: number; onChange: (mask: number) => void}) {
  return (
    <div
      role="group"
      aria-label="Days of the week"
      className="grid grid-cols-7 gap-1"
    >
      {weekdays.map((weekday) => {
        const on = (mask & weekday.bit) !== 0;
        return (
          <Button
            key={weekday.bit}
            size="xs"
            variant={on ? 'default' : 'outline'}
            aria-pressed={on}
            aria-label={weekday.long}
            className="px-0"
            onPress={() => onChange(mask ^ weekday.bit)}
          >
            {weekday.short.slice(0, 2)}
          </Button>
        );
      })}
    </div>
  );
}

function OccasionFields({value, onChange}: {value: Partial<Occasion>; onChange: (value: Partial<Occasion>) => void}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Live session (optional)</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Time
          <input
            type="time"
            value={value.time ?? ''}
            onChange={(event) => onChange({...value, time: event.target.value})}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Place
          <input
            value={value.place ?? ''}
            onChange={(event) => onChange({...value, place: event.target.value})}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Coach who leads
          <select
            value={value.coach ?? ''}
            onChange={(event) => onChange({...value, coach: event.target.value})}
            className={fieldClass}
          >
            <option value="">Nobody, client trains alone</option>
            <option value="Sam">Sam</option>
            <option value="You">You</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

function closeWith(onClose: () => void) {
  return (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
}

export type Commit = (next: State, message: string) => void;

export function ScheduledDialog({
  state,
  commit,
  schedule,
  day,
  onClose,
}: {
  state: State;
  commit: Commit;
  schedule: Schedule;
  day: (typeof weekdays)[number];
  onClose: () => void;
}) {
  const workout = workoutOf(state, schedule);
  const [mask, setMask] = useState(schedule.mask);
  const [occasion, setOccasion] = useState<Partial<Occasion>>(pick(schedule));
  const apply = (next: State, message: string) => {
    commit(next, message);
    onClose();
  };
  const name = workout?.name ?? 'Workout';
  return (
    <Dialog
      isOpen
      onOpenChange={closeWith(onClose)}
    >
      <DialogHeader>
        <DialogTitle>{workout?.name}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-5">
        <p className="text-sm text-muted-foreground">{workout?.summary}</p>
        <div className="space-y-2">
          <p className="text-sm font-medium">Every week on</p>
          <WeekdayPicker
            mask={mask}
            onChange={setMask}
          />
          <p className="text-sm text-muted-foreground">{mask === 0 ? 'No days selected.' : daysLabel(mask)}</p>
        </div>
        <OccasionFields
          value={occasion}
          onChange={setOccasion}
        />
        <p className="text-sm text-muted-foreground">Changes apply from today. Earlier weeks stay as they were.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            onPress={() => apply(actions.removeFromDay(state, schedule, day.bit), `${name} removed from ${day.long}.`)}
          >
            Remove from {day.long}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <a
              href="/prototype/workout-builder"
              className="flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
            >
              Edit workout
            </a>
            <Button
              isDisabled={mask === 0}
              onPress={() => apply(actions.update(state, schedule, mask, occasion), `${name} saved.`)}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function AddToDayDialog({
  state,
  commit,
  day,
  onClose,
}: {
  state: State;
  commit: Commit;
  day: (typeof weekdays)[number];
  onClose: () => void;
}) {
  const add = (workout: ClientWorkout | Omit<ClientWorkout, 'id'>) => {
    let next = state;
    let id = 'id' in workout ? workout.id : '';
    if (!('id' in workout)) {
      [next, id] = actions.copyFromLibrary(state, workout);
    }
    commit(actions.addToDay(next, id, day.bit), `${workout.name} added to ${day.long}.`);
    onClose();
  };
  const [search, setSearch] = useState('');
  const matches = <T extends {name: string}>(items: T[]) =>
    items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  const item = (workout: ClientWorkout | Omit<ClientWorkout, 'id'>) => (
    <li key={'id' in workout ? workout.id : workout.name}>
      <Button
        variant="ghost"
        className="h-auto w-full flex-col items-start whitespace-normal py-2 text-left"
        onPress={() => add(workout)}
      >
        <span className="font-semibold">{workout.name}</span>
        <span className="text-sm font-medium text-muted-foreground">{workout.summary}</span>
      </Button>
    </li>
  );
  return (
    <Dialog
      isOpen
      onOpenChange={closeWith(onClose)}
    >
      <DialogHeader>
        <DialogTitle>Add to {day.long}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label className="grid gap-2 text-sm font-medium">
          Search workouts
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${fieldClass} font-normal`}
          />
        </label>
        {matches(state.workouts).length > 0 && (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">This client’s workouts</h3>
            <ul>{matches(state.workouts).map(item)}</ul>
          </section>
        )}
        {matches(library).length > 0 && (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">From your library (a copy is made)</h3>
            <ul>{matches(library).map(item)}</ul>
          </section>
        )}
        {matches(state.workouts).length + matches(library).length === 0 && (
          <p className="text-muted-foreground">No matching workouts.</p>
        )}
      </div>
    </Dialog>
  );
}
