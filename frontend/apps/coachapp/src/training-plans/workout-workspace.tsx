import {useEffect, useState} from 'react';
import {useFieldArray, useFormContext} from 'react-hook-form';
import type {Exercise} from '../api/exercises';
import {Button} from '../ui/button';
import {Surface} from '../ui/page';
import {ExercisePicker} from './exercise-picker';
import {type DraftWorkout, duplicateWorkout, newSet, type PrescriptionDraft, weekdays} from './prescription';
import {WeekStrip} from './week-strip';
import {WorkoutEditor} from './workout-editor';

export function WorkoutWorkspace({
  readOnly,
  activeIndex,
  onSelect,
}: {
  readOnly: boolean;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const workouts = useFieldArray({control: form.control, name: 'workouts', keyName: '_key'});
  const [picking, setPicking] = useState(false);
  const [removed, setRemoved] = useState<{
    workout: DraftWorkout;
    index: number;
    days: (typeof weekdays)[number][];
  } | null>(null);
  const dirty = form.formState.isDirty;
  useEffect(() => {
    if (!dirty) {
      setRemoved(null);
    }
  }, [dirty]);
  function addWorkout(selected: Exercise[]) {
    const index = workouts.fields.length;
    workouts.append(
      {
        local_ref: crypto.randomUUID(),
        name: `Workout ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`,
        position: index,
        prescribed_exercises: selected.map((exercise, position) => ({
          local_ref: crypto.randomUUID(),
          exercise_id: exercise.id,
          name: exercise.name,
          position,
          prescribed_sets: Array.from({length: 3}, () => newSet()),
        })),
      },
      {shouldFocus: false},
    );
    onSelect(index);
    setPicking(false);
  }
  return (
    <div className="space-y-6">
      {workouts.fields.length > 0 && (
        <WeekStrip
          readOnly={readOnly}
          onAssign={(day) => {
            setRemoved((previous) =>
              previous ? {...previous, days: previous.days.filter((assigned) => assigned !== day)} : null,
            );
          }}
        />
      )}
      {workouts.fields.length === 0 && (
        <Surface className="space-y-4 py-10 text-center">
          <h2 className="text-xl font-semibold">Start with the movements</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Choose exercises for your first workout. Set the targets, then place it in your week.
          </p>
          {!readOnly && <Button onPress={() => setPicking(true)}>Add exercises</Button>}
        </Surface>
      )}
      {removed && !readOnly && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm"
        >
          <span className="min-w-0 break-words">Removed {removed.workout.name}.</span>
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              const index = Math.min(removed.index, workouts.fields.length);
              workouts.insert(index, removed.workout, {shouldFocus: false});
              for (const day of removed.days) {
                if (!form.getValues(`schedule.${day}`)) {
                  form.setValue(`schedule.${day}`, removed.workout.id ?? removed.workout.local_ref ?? '', {
                    shouldDirty: true,
                  });
                }
              }
              onSelect(index);
              setRemoved(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      {workouts.fields.map((workout, index) => (
        <WorkoutEditor
          key={workout._key}
          index={index}
          count={workouts.fields.length}
          expanded={activeIndex === index}
          readOnly={readOnly}
          onToggle={() => onSelect(activeIndex === index ? -1 : index)}
          onMove={(target) => {
            workouts.move(index, target);
            onSelect(target);
          }}
          onRemove={() => {
            const source = form.getValues(`workouts.${index}`);
            const days = weekdays.filter(
              (day) => form.getValues(`schedule.${day}`) === (source.id ?? source.local_ref),
            );
            setRemoved({workout: source, index, days});
            for (const day of days) {
              form.setValue(`schedule.${day}`, '', {shouldDirty: true});
            }
            workouts.remove(index);
            onSelect(Math.max(0, index - 1));
          }}
          onDuplicate={() => {
            workouts.insert(index + 1, duplicateWorkout(form.getValues(`workouts.${index}`)), {shouldFocus: false});
            onSelect(index + 1);
          }}
        />
      ))}
      {workouts.fields.length > 0 && !readOnly && (
        <Button
          variant="outline"
          onPress={() => setPicking(true)}
        >
          Add workout
        </Button>
      )}
      {picking && (
        <ExercisePicker
          workoutName="a new workout"
          onSelect={addWorkout}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
