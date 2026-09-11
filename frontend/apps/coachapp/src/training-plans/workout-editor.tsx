import {ChevronDown, MoreHorizontal, Pencil} from 'lucide-react';
import {useState} from 'react';
import {useFieldArray, useFormContext, useWatch} from 'react-hook-form';
import type {Exercise} from '../api/exercises';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {DropdownMenu, DropdownMenuItem, DropdownMenuTrigger} from '../ui/dropdown-menu';
import {Input} from '../ui/input';
import {Surface} from '../ui/page';
import {ExercisePicker} from './exercise-picker';
import {ExerciseSets} from './exercise-sets';
import {type DraftExercise, newSet, type PrescriptionDraft, weekdays} from './prescription';

export function WorkoutEditor({
  index,
  count,
  expanded,
  readOnly,
  onToggle,
  onMove,
  onRemove,
  onDuplicate,
}: {
  index: number;
  count: number;
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onMove: (target: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const path = `workouts.${index}` as const;
  const workout = useWatch({control: form.control, name: path});
  const schedule = useWatch({control: form.control, name: 'schedule'});
  const exercises = useFieldArray({control: form.control, name: `${path}.prescribed_exercises`, keyName: '_key'});
  const [picking, setPicking] = useState(false);
  const [removed, setRemoved] = useState<{exercise: DraftExercise; index: number} | null>(null);
  const days = weekdays.filter((day) => schedule[day] === (workout.id ?? workout.local_ref));
  const nameError = form.formState.errors.workouts?.[index]?.name;
  return (
    <Surface className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${workout.name || `workout ${index + 1}`}`}
          aria-expanded={expanded}
          onPress={onToggle}
          className={
            expanded && !readOnly
              ? 'size-11 px-0'
              : 'h-auto min-h-12 min-w-0 flex-1 justify-start gap-3 whitespace-normal px-0 text-left'
          }
        >
          <ChevronDown
            aria-hidden="true"
            className={expanded ? '' : '-rotate-90'}
          />
          {(!expanded || readOnly) && (
            <span className="min-w-0 break-words text-xl font-bold">{workout.name || `Workout ${index + 1}`}</span>
          )}
        </Button>
        <div
          hidden={!expanded || readOnly}
          className="relative min-w-0 flex-1"
        >
          <label
            htmlFor={`${path}.name`}
            className="sr-only"
          >
            Workout name
          </label>
          <Input
            id={`${path}.name`}
            className="border-transparent pl-1 pr-7 text-xl font-bold shadow-none hover:border-border focus:border-border"
            maxLength={255}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${path}.name-error` : undefined}
            {...form.register(`${path}.name`, {validate: (value) => Boolean(value.trim()) || 'Enter a workout name.'})}
          />
          <Pencil
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-4 size-4 text-muted-foreground"
          />
          {nameError && (
            <p
              id={`${path}.name-error`}
              className="text-sm text-destructive"
            >
              {nameError.message}
            </p>
          )}
        </div>
        {!readOnly && (
          <OrderActions
            label={`workout ${index + 1}`}
            index={index}
            count={count}
            onMove={onMove}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
          />
        )}
      </div>
      <p className="text-xs capitalize text-muted-foreground">{days.length ? days.join(' · ') : 'Not scheduled yet'}</p>
      {!expanded && (
        <p className="break-words text-sm text-muted-foreground">
          {workout.prescribed_exercises.map((exercise) => exercise.name).join(' · ') || 'No exercises yet'}
        </p>
      )}
      <div
        hidden={!expanded}
        className="space-y-8 pt-3"
      >
        {removed && !readOnly && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm"
          >
            <span>Removed {removed.exercise.name}.</span>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                exercises.insert(Math.min(removed.index, exercises.fields.length), removed.exercise, {
                  shouldFocus: false,
                });
                setRemoved(null);
              }}
            >
              Undo
            </Button>
          </div>
        )}
        {exercises.fields.map((exercise, exerciseIndex) => (
          <ExerciseEditor
            key={exercise._key}
            workoutIndex={index}
            index={exerciseIndex}
            count={exercises.fields.length}
            readOnly={readOnly}
            onMove={(target) => exercises.move(exerciseIndex, target)}
            onRemove={() => {
              setRemoved({
                exercise: form.getValues(`${path}.prescribed_exercises.${exerciseIndex}`),
                index: exerciseIndex,
              });
              exercises.remove(exerciseIndex);
            }}
            onDuplicate={() => {
              const source = form.getValues(`${path}.prescribed_exercises.${exerciseIndex}`);
              exercises.insert(
                exerciseIndex + 1,
                {
                  local_ref: crypto.randomUUID(),
                  exercise_id: source.exercise_id,
                  name: source.name,
                  position: exerciseIndex + 1,
                  prescribed_sets: source.prescribed_sets.map((set) => ({...set})),
                },
                {shouldFocus: false},
              );
            }}
          />
        ))}
        {exercises.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Choose the movements for this session.</p>
        )}
        {!readOnly && (
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="outline"
              onPress={() => setPicking(true)}
            >
              Add exercises
            </Button>
            <Button
              variant="ghost"
              onPress={onDuplicate}
            >
              Create a variation
            </Button>
          </div>
        )}
      </div>
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          workoutName={workout.name}
          onSelect={(selected) => {
            exercises.append(
              selected.map((exercise, position) => ({
                local_ref: crypto.randomUUID(),
                exercise_id: exercise.id,
                name: exercise.name,
                position: exercises.fields.length + position,
                prescribed_sets: Array.from({length: 3}, () => newSet()),
              })),
              {shouldFocus: false},
            );
            setPicking(false);
          }}
        />
      )}
    </Surface>
  );
}
function ExerciseEditor({
  workoutIndex,
  index,
  count,
  readOnly,
  onMove,
  onRemove,
  onDuplicate,
}: {
  workoutIndex: number;
  index: number;
  count: number;
  readOnly: boolean;
  onMove: (target: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const path = `workouts.${workoutIndex}.prescribed_exercises.${index}` as const;
  const exercise = useWatch({control: form.control, name: path});
  const [replacement, setReplacement] = useState<{kind: 'picking'} | {kind: 'confirm'; exercise: Exercise} | null>(
    null,
  );
  function replace(reset: boolean) {
    if (replacement?.kind !== 'confirm') {
      return;
    }
    form.setValue(`${path}.exercise_id`, replacement.exercise.id, {shouldDirty: true});
    form.setValue(`${path}.name`, replacement.exercise.name, {shouldDirty: true});
    if (reset) {
      form.setValue(
        `${path}.prescribed_sets`,
        Array.from({length: 3}, () => newSet()),
        {shouldDirty: true},
      );
    }
    setReplacement(null);
  }
  return (
    <section
      aria-label={`${exercise.name} prescription`}
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3 pb-1">
        <h3 className="min-w-0 break-words text-lg font-semibold leading-snug text-foreground">{exercise.name}</h3>
        {!readOnly && (
          <OrderActions
            label={`exercise ${index + 1}`}
            index={index}
            count={count}
            onMove={onMove}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onReplace={() => setReplacement({kind: 'picking'})}
          />
        )}
      </div>
      <ExerciseSets
        workoutIndex={workoutIndex}
        exerciseIndex={index}
        readOnly={readOnly}
      />
      {replacement?.kind === 'picking' && (
        <ExercisePicker
          purpose="replace"
          workoutName={exercise.name}
          onClose={() => setReplacement(null)}
          onSelect={(selected) => {
            const first = selected[0];
            if (first) {
              setReplacement({kind: 'confirm', exercise: first});
            }
          }}
        />
      )}
      <Dialog
        isOpen={replacement?.kind === 'confirm'}
        onOpenChange={(open) => {
          if (!open) {
            setReplacement(null);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Keep the targets?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="text-sm text-muted-foreground">
            Replace {exercise.name} with {replacement?.kind === 'confirm' ? replacement.exercise.name : ''}. Keep the
            current sets and instructions, or start with three empty sets.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onPress={() => replace(false)}>Keep targets</Button>
            <Button
              variant="outline"
              onPress={() => replace(true)}
            >
              Reset targets
            </Button>
            <Button
              variant="ghost"
              onPress={() => setReplacement(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
function OrderActions({
  label,
  index,
  count,
  onMove,
  onRemove,
  onDuplicate,
  onReplace,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (target: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onReplace?: () => void;
}) {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${label} actions`}
      >
        <MoreHorizontal aria-hidden="true" />
      </Button>
      <DropdownMenu
        aria-label={`${label} actions`}
        placement="bottom end"
      >
        {onReplace && <DropdownMenuItem onAction={onReplace}>Replace movement</DropdownMenuItem>}
        <DropdownMenuItem
          isDisabled={index === 0}
          onAction={() => onMove(index - 1)}
        >
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem
          isDisabled={index === count - 1}
          onAction={() => onMove(index + 1)}
        >
          Move down
        </DropdownMenuItem>
        <DropdownMenuItem onAction={onDuplicate}>Duplicate {label}</DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onAction={onRemove}
        >
          Remove {label}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
