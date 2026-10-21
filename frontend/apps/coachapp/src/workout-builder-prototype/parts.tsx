// PROTOTYPE — throwaway. Pieces shared by the three builder variants.
import {Plus} from 'lucide-react';
import {useState} from 'react';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {
  actions,
  getTarget,
  kindLabels,
  type LibraryExercise,
  library,
  metricInfo,
  modeLabels,
  targetHint,
  typeLabels,
  type Where,
  type Workout,
  type WorkoutType,
} from './model';

export type BuilderProps = {workout: Workout; setWorkout: (next: Workout) => void};

export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20';

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  stackOnPhone = false,
}: {
  label: string;
  options: Array<{value: T; label: string}>;
  value: T;
  onChange: (value: T) => void;
  stackOnPhone?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'gap-1 rounded-xl bg-muted p-1',
        stackOnPhone ? 'grid grid-cols-2 sm:inline-flex sm:flex-wrap' : 'inline-flex flex-wrap',
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          size="xs"
          variant={option.value === value ? 'outline' : 'ghost'}
          aria-pressed={option.value === value}
          className={cn(
            option.value === value && 'bg-surface shadow-sm hover:bg-surface',
            stackOnPhone && 'h-auto min-h-11 whitespace-normal py-2',
          )}
          onPress={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function WorkoutHeader({workout, setWorkout}: BuilderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-1">Library workout</span>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-muted-foreground">Workout name</span>
        <input
          value={workout.name}
          onChange={(event) => setWorkout({...workout, name: event.target.value})}
          className="w-full rounded-lg bg-transparent text-3xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-4xl"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-muted-foreground">Instructions for the client (optional)</span>
        <textarea
          value={workout.description}
          onChange={(event) => setWorkout({...workout, description: event.target.value})}
          rows={2}
          className={cn(fieldClass, 'h-auto w-full py-2 leading-relaxed')}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">What the client does</span>
        <Segmented<WorkoutType>
          label="Workout type"
          value={workout.type}
          onChange={(type) => setWorkout({...workout, type})}
          options={(Object.keys(typeLabels) as WorkoutType[]).map((value) => ({value, label: typeLabels[value]}))}
        />
      </div>
    </div>
  );
}

export function OtherTypePanel({type}: {type: WorkoutType}) {
  if (type === 'video') {
    return (
      <section className="surface space-y-3">
        <h2 className="text-lg font-semibold">Video</h2>
        <p className="text-muted-foreground">
          The client follows the video on the scheduled day. They can record sets if they want; it is not required.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Video link"
            placeholder="Paste a YouTube or Vimeo link"
            className={cn(fieldClass, 'min-w-64 flex-1')}
          />
          <Button variant="outline">Upload a video</Button>
        </div>
      </section>
    );
  }
  return (
    <section className="surface space-y-2">
      <h2 className="text-lg font-semibold">Open session</h2>
      <p className="text-muted-foreground">
        No content is prepared. The coach who leads the session decides on the spot and records what happened. Time,
        place and coach are set when you schedule it.
      </p>
    </section>
  );
}

export function TargetEditor({
  workout,
  setWorkout,
  where,
  onClose,
  onPerRound,
  className,
  id,
}: BuilderProps & {
  where: Where;
  onClose?: () => void;
  onPerRound?: (perRound: boolean) => void;
  className?: string;
  id?: string;
}) {
  const group = workout.groups[where.group];
  const exercise = group?.exercises[where.exercise];
  if (!group || !exercise) {
    return null;
  }
  const info = metricInfo[where.key];
  const target = getTarget(exercise, where.key, where.round) ?? {mode: 'choose'};
  const set = (patch: Parameters<typeof actions.setTarget>[2]) => setWorkout(actions.setTarget(workout, where, patch));
  const scope =
    where.round !== null
      ? ` · round ${where.round + 1}`
      : exercise.perRound || group.rounds === 1
        ? ''
        : ` · all ${group.rounds} rounds`;
  const isLast = group.exercises.length > 1 && where.exercise === group.exercises.length - 1;
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={id && `${id}-title`}
      className={cn('space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={id && `${id}-title`}
          className="font-semibold"
        >
          {info.label} — {exercise.name}
          {scope}
        </h3>
        {onClose && (
          <Button
            size="xs"
            variant="ghost"
            onPress={onClose}
          >
            Done
          </Button>
        )}
      </div>
      {onPerRound && group.rounds > 1 && (
        <Segmented
          label="Rounds this target applies to"
          stackOnPhone
          value={exercise.perRound ? 'each' : 'all'}
          onChange={(value) => onPerRound(value === 'each')}
          options={[
            {value: 'all', label: `Same for all ${group.rounds} rounds`},
            {value: 'each', label: 'Different per round'},
          ]}
        />
      )}
      <Segmented
        label="Target type"
        stackOnPhone
        value={target.mode}
        onChange={(mode) => set({mode})}
        options={info.modes.map((mode) => ({value: mode, label: modeLabels[mode]}))}
      />
      {(target.mode === 'exact' || target.mode === 'percent') && (
        <label className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{target.mode === 'percent' ? 'Percent' : 'Value'}</span>
          <input
            inputMode="decimal"
            value={target.v ?? ''}
            onChange={(event) => set({v: event.target.value})}
            className={cn(fieldClass, 'w-28 font-mono')}
          />
          <span className="text-muted-foreground">{target.mode === 'percent' ? '% of 1RM' : info.unit}</span>
        </label>
      )}
      {target.mode === 'range' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="font-medium">From</span>
            <input
              inputMode="decimal"
              value={target.min ?? ''}
              onChange={(event) => set({min: event.target.value})}
              className={cn(fieldClass, 'w-24 font-mono')}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium">to</span>
            <input
              inputMode="decimal"
              value={target.max ?? ''}
              onChange={(event) => set({max: event.target.value})}
              className={cn(fieldClass, 'w-24 font-mono')}
            />
          </label>
          <span className="text-muted-foreground">{info.unit}</span>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{targetHint(target, where.key, isLast)}</p>
    </div>
  );
}

export function ExercisePicker({
  title = 'Add an exercise',
  onPick,
  onClose,
}: {
  title?: string;
  onPick: (exercise: LibraryExercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const matches = library.filter((exercise) => exercise.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label className="grid gap-2 text-sm font-medium">
          Search exercises
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={cn(fieldClass, 'w-full font-normal')}
          />
        </label>
        {matches.length === 0 && <p className="text-muted-foreground">No matching exercises.</p>}
        <ul className="space-y-2">
          {matches.map((exercise) => (
            <li key={exercise.name}>
              <Button
                variant="ghost"
                className="h-auto w-full justify-between whitespace-normal py-3 text-left"
                onPress={() => onPick(exercise)}
              >
                <span className="space-y-1">
                  <span className="block font-semibold">{exercise.name}</span>
                  <span className="block text-sm font-medium text-muted-foreground">
                    {kindLabels[exercise.kind]}
                    {exercise.unilateral ? ' · Each side' : ''} ·{' '}
                    {exercise.metrics.map((key) => metricInfo[key].label).join(', ')}
                  </span>
                </span>
                <Plus aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
