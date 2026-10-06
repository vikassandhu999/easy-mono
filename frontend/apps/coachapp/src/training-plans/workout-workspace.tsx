import {useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {setSummary} from '../ui/training-prescription';
import {ExercisePicker} from './exercise-picker';
import {type DraftWorkout, duplicateWorkout, newSet, type PrescriptionDraft, weekdays} from './prescription';
import {NumberField, SetEditor} from './set-editor';

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
  const workouts = useWatch({control: form.control, name: 'workouts'});
  const schedule = useWatch({control: form.control, name: 'schedule'});
  const [picking, setPicking] = useState<{workout: number; block: number} | null>(null);
  const updateWorkouts = (values: DraftWorkout[]) => form.setValue('workouts', values, {shouldDirty: true});
  const changeWorkout = (index: number, workout: DraftWorkout) =>
    updateWorkouts(workouts.map((item, i) => (i === index ? workout : item)));
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="editor-section-title">Weekly schedule</h2>
        <p className="text-sm text-muted-foreground">Add zero or more workouts to each day.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {weekdays.map((day, dayIndex) => (
            <div
              key={day}
              className="space-y-2 rounded-xl bg-muted/40 p-3"
            >
              <h3 className="font-semibold">{day}</h3>
              {schedule.entries
                .filter((entry) => entry.day === dayIndex)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-end gap-1"
                  >
                    <SelectField
                      aria-label={`${day} workout`}
                      value={entry.ref}
                      isDisabled={readOnly}
                      onChange={(ref) =>
                        form.setValue(
                          'schedule.entries',
                          schedule.entries.map((item) => (item.id === entry.id ? {...item, ref} : item)),
                          {shouldDirty: true},
                        )
                      }
                    >
                      {workouts.map((workout) => (
                        <SelectItem
                          key={workout.id}
                          id={workout.id}
                        >
                          {workout.name}
                        </SelectItem>
                      ))}
                    </SelectField>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        aria-label={`Remove ${day} workout`}
                        onPress={() =>
                          form.setValue(
                            'schedule.entries',
                            schedule.entries.filter((item) => item.id !== entry.id),
                            {shouldDirty: true},
                          )
                        }
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={!workouts[0]}
                  onPress={() => {
                    const first = workouts[0];
                    if (first) {
                      form.setValue(
                        'schedule.entries',
                        [...schedule.entries, {id: crypto.randomUUID(), day: dayIndex, ref: first.id}],
                        {shouldDirty: true},
                      );
                    }
                  }}
                >
                  Add {day} workout
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
      {workouts.map((workout, wi) => (
        <Surface
          key={workout.id}
          className="space-y-4"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="editor-section-title">
              <Button
                variant="ghost"
                className="h-auto whitespace-normal text-left text-xl font-semibold"
                onPress={() => onSelect(activeIndex === wi ? -1 : wi)}
              >
                {workout.name}
              </Button>
            </h2>
            {!readOnly && (
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  onPress={() =>
                    updateWorkouts([...workouts.slice(0, wi + 1), duplicateWorkout(workout), ...workouts.slice(wi + 1)])
                  }
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    updateWorkouts(workouts.filter((item) => item.id !== workout.id));
                    form.setValue(
                      'schedule.entries',
                      schedule.entries.filter((entry) => entry.ref !== workout.id),
                      {shouldDirty: true},
                    );
                  }}
                >
                  Remove workout
                </Button>
              </div>
            )}
          </div>
          {(activeIndex === wi || readOnly) && (
            <>
              {!readOnly && (
                <label
                  htmlFor={`workout-${workout.id}`}
                  className="grid gap-2 text-sm font-medium"
                >
                  Workout name
                  <Input
                    id={`workout-${workout.id}`}
                    value={workout.name}
                    required
                    onChange={(event) => changeWorkout(wi, {...workout, name: event.target.value})}
                  />
                </label>
              )}
              {workout.blocks.map((block, bi) => (
                <section
                  key={block.id}
                  className="space-y-4 border-t border-border pt-4"
                >
                  {readOnly ? (
                    <h3 className="capitalize font-semibold">{block.format}</h3>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <SelectField
                        aria-label="Block format"
                        value={block.format}
                        onChange={(format) => {
                          if (format === 'straight' || format === 'superset' || format === 'circuit') {
                            form.setValue(`workouts.${wi}.blocks.${bi}.format`, format, {shouldDirty: true});
                          }
                        }}
                      >
                        <SelectItem id="straight">Straight</SelectItem>
                        <SelectItem id="superset">Superset</SelectItem>
                        <SelectItem id="circuit">Circuit</SelectItem>
                      </SelectField>
                      <NumberField
                        label="Rounds"
                        value={block.rounds}
                        min={1}
                        onChange={(rounds) =>
                          form.setValue(`workouts.${wi}.blocks.${bi}.rounds`, rounds, {shouldDirty: true})
                        }
                      />
                      <NumberField
                        label="Block rest (s)"
                        value={block.rest_s}
                        onChange={(rest_s) =>
                          form.setValue(`workouts.${wi}.blocks.${bi}.rest_s`, rest_s, {shouldDirty: true})
                        }
                      />
                    </div>
                  )}
                  {block.items.map((item, ii) => (
                    <div
                      key={item.id}
                      className="space-y-3"
                    >
                      <h3 className="editor-item-title">{item.exercise_name}</h3>
                      {item.sets.map((set, si) => (
                        <details
                          key={set.id}
                          className="space-y-3 rounded-xl bg-muted/30 p-3"
                          open={!readOnly && si === 0}
                        >
                          <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">
                            Set {si + 1} · {setSummary(set)}
                          </summary>
                          {readOnly ? (
                            <p>{set.notes}</p>
                          ) : (
                            <>
                              <SetEditor
                                set={set}
                                onChange={(updated) =>
                                  form.setValue(
                                    `workouts.${wi}.blocks.${bi}.items.${ii}.sets`,
                                    item.sets.map((target) => (target.id === updated.id ? updated : target)),
                                    {shouldDirty: true},
                                  )
                                }
                              />
                              <Button
                                variant="ghost"
                                onPress={() =>
                                  form.setValue(
                                    `workouts.${wi}.blocks.${bi}.items.${ii}.sets`,
                                    item.sets.filter((target) => target.id !== set.id),
                                    {shouldDirty: true},
                                  )
                                }
                              >
                                Remove set
                              </Button>
                            </>
                          )}
                        </details>
                      ))}
                      {!readOnly && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onPress={() =>
                              form.setValue(`workouts.${wi}.blocks.${bi}.items.${ii}.sets`, [...item.sets, newSet()], {
                                shouldDirty: true,
                              })
                            }
                          >
                            Add set
                          </Button>
                          <Button
                            variant="ghost"
                            onPress={() =>
                              form.setValue(
                                `workouts.${wi}.blocks.${bi}.items`,
                                block.items.filter((target) => target.id !== item.id),
                                {shouldDirty: true},
                              )
                            }
                          >
                            Remove exercise
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onPress={() => setPicking({workout: wi, block: bi})}
                      >
                        Add exercises
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() =>
                          changeWorkout(wi, {...workout, blocks: workout.blocks.filter((item) => item.id !== block.id)})
                        }
                      >
                        Remove block
                      </Button>
                    </div>
                  )}
                </section>
              ))}
              {!readOnly && (
                <Button
                  variant="outline"
                  onPress={() =>
                    changeWorkout(wi, {
                      ...workout,
                      blocks: [...workout.blocks, {id: crypto.randomUUID(), format: 'straight', items: []}],
                    })
                  }
                >
                  Add block
                </Button>
              )}
            </>
          )}
        </Surface>
      ))}
      {!readOnly && (
        <Button
          variant="outline"
          onPress={() => {
            updateWorkouts([
              ...workouts,
              {
                id: crypto.randomUUID(),
                name: `Workout ${workouts.length + 1}`,
                notes: null,
                blocks: [{id: crypto.randomUUID(), format: 'straight', items: []}],
              },
            ]);
            onSelect(workouts.length);
          }}
        >
          Add workout
        </Button>
      )}
      {picking && (
        <ExercisePicker
          workoutName={workouts[picking.workout]?.name ?? 'workout'}
          onClose={() => setPicking(null)}
          onSelect={(selected) => {
            const workout = workouts[picking.workout];
            if (workout) {
              changeWorkout(picking.workout, {
                ...workout,
                blocks: workout.blocks.map((block, index) =>
                  index !== picking.block
                    ? block
                    : {
                        ...block,
                        items: [
                          ...block.items,
                          ...selected.map((exercise) => ({
                            id: crypto.randomUUID(),
                            exercise_id: exercise.id,
                            exercise_name: exercise.name,
                            sets: [newSet()],
                          })),
                        ],
                      },
                ),
              });
            }
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
