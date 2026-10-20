import {type MetricKey, metricLabel} from '@easy/workouts/metrics';
import {targetModes} from '@easy/workouts/targets';
import {useEffect, useState} from 'react';
import type {Exercise} from '../api/exercises';
import {useExercises} from '../api/exercises';
import {kindLabels} from '../exercises/exercise';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
import {
  actions,
  getTarget,
  infoFor,
  labelFor,
  type Mode,
  modeLabels,
  type Target,
  type Where,
  type Workout,
} from './model';

export type BuilderProps = {workout: Workout; setWorkout: (next: Workout) => void};
export const fieldClass =
  'h-11 rounded-xl border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20';
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: {value: T; label: string}[];
  value: T;
  onChange: (value: T) => void;
}) {
  // Three choices fit one row on a phone; longer lists use two columns (U2).
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'grid gap-1 rounded-xl bg-muted p-1 sm:flex sm:flex-wrap',
        options.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant={option.value === value ? 'outline' : 'ghost'}
          aria-pressed={option.value === value}
          className="min-h-11 h-auto whitespace-normal px-2 py-2 sm:px-5"
          onPress={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
export function TargetEditor({
  workout,
  setWorkout,
  where,
  onClose,
  onPerRound,
  id,
  className,
}: BuilderProps & {
  where: Where;
  onClose: () => void;
  onPerRound: (perRound: boolean) => void;
  id: string;
  className?: string;
}) {
  const group = workout.groups[where.group];
  const exercise = group?.exercises[where.exercise];
  if (!group || !exercise) {
    return null;
  }
  const info = infoFor(where.key);
  const target = getTarget(exercise, where.key, where.round) ?? {mode: 'client_chooses'};
  const put = (next: Target) => setWorkout(actions.putTarget(workout, where, next));
  const modes: readonly Mode[] =
    where.key === 'rest' ? ['client_chooses', 'none', 'exact', 'range'] : targetModes(where.key as MetricKey | 'grade');
  const changeMode = (mode: Mode) =>
    put(
      mode === 'exact'
        ? {mode, v: target.v ?? ''}
        : mode === 'range'
          ? {mode, min: target.min ?? target.v ?? '', max: target.max ?? target.v ?? ''}
          : {mode},
    );
  const hints = {
    exact: 'The client sees this target and records what they did.',
    range: 'The client aims inside this range.',
    max: 'The client does as much as possible.',
    client_chooses: 'The client chooses and records what they did.',
    none: 'The client goes straight to the next exercise.',
  };
  const choices = where.key === 'result' ? ['win', 'draw', 'loss'] : null;
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${id}-title`}
      className={cn('space-y-3 rounded-xl bg-muted p-4', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id={`${id}-title`}
          className="font-semibold"
        >
          {labelFor(where.key, exercise.source)} — {exercise.source.name}
          {where.round !== null ? ` · round ${where.round + 1}` : ` · all ${group.rounds} rounds`}
        </h3>
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Done
        </Button>
      </div>
      {group.rounds > 1 && (
        <Segmented
          label="Rounds this target applies to"
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
        value={target.mode}
        onChange={changeMode}
        options={modes.map((mode) => ({value: mode, label: modeLabels[mode]}))}
      />
      {target.mode === 'exact' && (
        <label
          htmlFor={`${id}-value`}
          className="grid max-w-xs gap-1"
        >
          <span className="font-medium">Value {info?.unit ? `(${info.unit})` : ''}</span>
          {choices ? (
            <select
              id={`${id}-value`}
              className={fieldClass}
              value={target.v ?? ''}
              onChange={(event) => put({...target, v: event.target.value})}
            >
              <option value="">Choose {labelFor(where.key).toLowerCase()}</option>
              {choices.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`${id}-value`}
              inputMode={info?.text ? 'text' : 'decimal'}
              value={target.v ?? ''}
              onChange={(event) => put({...target, v: event.target.value})}
            />
          )}
        </label>
      )}
      {target.mode === 'range' && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          {(['min', 'max'] as const).map((field) => (
            <label
              key={field}
              htmlFor={`${id}-${field}`}
              className="grid gap-1"
            >
              <span className="font-medium">
                {field === 'min' ? 'From' : 'To'} {info?.unit ? `(${info.unit})` : ''}
              </span>
              <Input
                id={`${id}-${field}`}
                inputMode="decimal"
                value={target[field] ?? ''}
                onChange={(event) => put({...target, [field]: event.target.value})}
              />
            </label>
          ))}
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground">
        {where.key === 'rest' && where.exercise === group.exercises.length - 1
          ? 'This is the rest between rounds. '
          : ''}
        {hints[target.mode]}
      </p>
    </div>
  );
}
export function ExercisePicker({
  title,
  onClose,
  onPick,
}: {
  title: string;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useExercises({search: debounced});
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      data-workout-picker
      className="max-w-xl"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label
          htmlFor="workout-exercise-search"
          className="grid gap-1"
        >
          <span className="text-sm font-medium">Search exercises</span>
          <Input
            id="workout-exercise-search"
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <InfiniteList
          query={query}
          label="exercises"
          singular="exercise"
          empty={<p className="py-4 text-muted-foreground">No matching exercises. Try another name.</p>}
        >
          {(exercise) => (
            <Button
              variant="ghost"
              className="h-auto min-h-14 w-full justify-start rounded-none px-4 py-3 text-left"
              onPress={() => onPick(exercise)}
            >
              <span className="min-w-0 whitespace-normal">
                <span className="block font-semibold">{exercise.name}</span>
                <span className="block text-sm font-medium text-muted-foreground">
                  {kindLabels[exercise.kind]}
                  {' · '}
                  {exercise.metrics.map((metric) => metricLabel(metric.key, metric)).join(' · ')}
                </span>
              </span>
            </Button>
          )}
        </InfiniteList>
      </div>
    </Dialog>
  );
}
