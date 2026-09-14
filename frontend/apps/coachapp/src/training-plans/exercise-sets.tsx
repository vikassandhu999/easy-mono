import {useState} from 'react';
import {useFieldArray, useFormContext, useWatch} from 'react-hook-form';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {type DraftSet, newSet, type PrescriptionDraft, samePrescription, setSummary} from './prescription';
import {SetEditor} from './set-editor';
import {matchesTargets, SetPrescription, type SetPrescriptionMode, type SetTargets} from './set-prescription';

export function ExerciseSets({
  workoutIndex,
  exerciseIndex,
  readOnly,
}: {
  workoutIndex: number;
  exerciseIndex: number;
  readOnly: boolean;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const path = `workouts.${workoutIndex}.prescribed_exercises.${exerciseIndex}.prescribed_sets` as const;
  const sets = useFieldArray({control: form.control, name: path, keyName: '_key'});
  const values = useWatch({control: form.control, name: path});
  const first = values[0];
  const uniform = Boolean(
    first && (!first.set_type || first.set_type === 'working') && values.every((set) => samePrescription(set, first)),
  );
  const [expanded, setExpanded] = useState(false);
  const [removed, setRemoved] = useState<{set: DraftSet; index: number} | null>(null);
  const [resized, setResized] = useState<DraftSet[] | null>(null);
  const [composer, setComposer] = useState<SetPrescriptionMode | null>(null);
  const errors = form.formState.errors.workouts?.[workoutIndex]?.prescribed_exercises?.[exerciseIndex]?.prescribed_sets;
  const open = expanded || !uniform || Boolean(errors);
  function updateShared(targets: Partial<SetTargets>) {
    form.getValues(path).forEach((set, index) => {
      form.setValue(`${path}.${index}`, {...set, ...targets}, {shouldDirty: true});
    });
  }
  return (
    <div className="space-y-3">
      {readOnly &&
        (uniform && first ? (
          <div className="break-words text-sm text-muted-foreground">
            <p>
              {values.length} sets · {setSummary(first)}
            </p>
            {first.notes && <p className="mt-1 whitespace-pre-wrap">{first.notes}</p>}
          </div>
        ) : (
          <ol
            aria-label="Set targets"
            className="space-y-2 text-sm text-muted-foreground"
          >
            {values.map((set, index) => (
              <li
                key={index}
                className="break-words"
              >
                <p>
                  {set.set_type === 'warmup' ? 'Warm-up' : set.set_type === 'dropset' ? 'Drop set' : `Set ${index + 1}`}{' '}
                  · {setSummary(set)}
                </p>
                {set.notes && <p className="mt-1 whitespace-pre-wrap">{set.notes}</p>}
              </li>
            ))}
          </ol>
        ))}
      <div
        hidden={readOnly}
        className="space-y-3"
      >
        {uniform && first && !open && (
          <>
            <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="grid gap-1">
                <label
                  id={`${path}.count-label`}
                  htmlFor={`${path}.count`}
                  className="text-xs text-muted-foreground"
                >
                  Sets
                </label>
                <SelectField
                  id={`${path}.count`}
                  value={values.length}
                  onChange={(selected) => {
                    const count = Number(selected);
                    const current = form.getValues(path);
                    if (count < current.length) {
                      setResized(current.map((set) => ({...set})));
                    } else {
                      setResized(null);
                    }
                    sets.replace(Array.from({length: count}, (_, index) => ({...(current[index] ?? first)})));
                  }}
                >
                  {Array.from({length: Math.max(30, values.length)}, (_, index) => (
                    <SelectItem
                      key={index}
                      id={String(index + 1)}
                    >
                      {String(index + 1)}
                    </SelectItem>
                  ))}
                </SelectField>
              </div>
              <div className="col-span-2 grid gap-1 sm:col-span-1">
                <label
                  htmlFor={`${path}.shared-reps`}
                  className="text-xs text-muted-foreground"
                >
                  Reps per set
                </label>
                <Input
                  id={`${path}.shared-reps`}
                  placeholder="e.g. 8–10"
                  value={first.reps}
                  onChange={(event) => updateShared({reps: event.target.value})}
                />
              </div>
              <div className="col-span-2 grid gap-1 sm:col-span-1">
                <label
                  htmlFor={`${path}.shared-load`}
                  className="text-xs text-muted-foreground"
                >
                  Load · optional
                </label>
                <div className="flex gap-1">
                  {first.load_unit !== 'bodyweight' && (
                    <Input
                      id={`${path}.shared-load`}
                      aria-label="Load"
                      inputMode="decimal"
                      placeholder="Choose load"
                      value={first.load_value}
                      className="min-w-0 flex-1"
                      onChange={(event) => updateShared({load_value: event.target.value})}
                    />
                  )}
                  <SelectField
                    aria-label="Load unit"
                    value={first.load_unit ?? ''}
                    className={first.load_unit === 'bodyweight' ? 'w-full' : 'w-20 shrink-0 sm:w-28'}
                    onChange={(selected) => {
                      const value = selected;
                      if (
                        value === '' ||
                        value === 'kg' ||
                        value === 'lbs' ||
                        value === 'bodyweight' ||
                        value === 'none'
                      ) {
                        updateShared({load_unit: value || null, ...(value === 'bodyweight' ? {load_value: ''} : {})});
                      }
                    }}
                  >
                    <SelectItem id="">Unit</SelectItem>
                    <SelectItem id="kg">kg</SelectItem>
                    <SelectItem id="lbs">lbs</SelectItem>
                    <SelectItem id="bodyweight">Bodyweight</SelectItem>
                    <SelectItem id="none">No unit</SelectItem>
                  </SelectField>
                </div>
              </div>
              <div className="grid gap-1">
                <label
                  htmlFor={`${path}.shared-rest`}
                  className="text-xs text-muted-foreground"
                >
                  Rest · seconds
                </label>
                <Input
                  id={`${path}.shared-rest`}
                  inputMode="numeric"
                  placeholder="Optional"
                  value={first.rest_seconds}
                  onChange={(event) => updateShared({rest_seconds: event.target.value})}
                />
              </div>
            </div>
            {(first.notes || first.rpe || first.duration_seconds || first.distance_value) && (
              <p className="break-words text-xs text-muted-foreground">
                {setSummary(first)}
                {first.notes ? ` · ${first.notes}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="px-0 font-normal text-muted-foreground"
                onPress={() => setComposer({kind: 'shared', source: {...first}})}
              >
                Duration, distance & effort
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-0 font-normal text-muted-foreground"
                onPress={() => setExpanded(true)}
              >
                Vary sets & add details
              </Button>
            </div>
          </>
        )}
        {resized && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>Set count reduced.</span>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                const current = form.getValues(path);
                sets.append(resized.slice(current.length), {shouldFocus: false});
                setResized(null);
              }}
            >
              Undo
            </Button>
          </div>
        )}
        {removed && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>Set removed.</span>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                sets.insert(Math.min(removed.index, sets.fields.length), removed.set, {shouldFocus: false});
                setRemoved(null);
              }}
            >
              Undo
            </Button>
          </div>
        )}
        <div
          hidden={!open}
          className="space-y-3"
        >
          {values.length > 0 && (
            <div
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-1.5 text-xs text-muted-foreground"
              aria-hidden="true"
            >
              <span>Set</span>
              <span>Reps</span>
              <span>Load</span>
              <span>Rest · sec</span>
              <span />
            </div>
          )}
          {sets.fields.map((set, index) => (
            <SetEditor
              key={set._key}
              workoutIndex={workoutIndex}
              exerciseIndex={exerciseIndex}
              index={index}
              count={sets.fields.length}
              onMove={(target) => sets.move(index, target)}
              onRemove={() => {
                setRemoved({set: {...form.getValues(`${path}.${index}`)}, index});
                sets.remove(index);
              }}
              onEditMatching={() => setComposer({kind: 'matching', source: {...form.getValues(`${path}.${index}`)}})}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            {values.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  const last = form.getValues(path).at(-1);
                  if (last) {
                    sets.append({...last}, {shouldFocus: false});
                  }
                }}
              >
                Repeat last set
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onPress={() => sets.prepend({...newSet(), set_type: 'warmup'}, {shouldFocus: false})}
            >
              + Warm-up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setComposer({kind: 'add'})}
            >
              {values.length ? 'Add sets…' : 'Prescribe sets'}
            </Button>
            {uniform && (
              <Button
                variant="ghost"
                size="sm"
                onPress={async () => {
                  if (await form.trigger(path)) {
                    setExpanded(false);
                  }
                }}
              >
                One prescription for all sets
              </Button>
            )}
          </div>
        </div>
      </div>
      {values.length === 0 && readOnly && <p className="text-sm text-muted-foreground">No sets prescribed.</p>}
      {composer && (
        <SetPrescription
          mode={composer}
          onClose={() => setComposer(null)}
          onApply={(targets, count) => {
            if (composer.kind === 'add') {
              sets.append(
                Array.from({length: count}, () => ({...newSet(), ...targets})),
                {shouldFocus: false},
              );
            } else {
              form.getValues(path).forEach((set, index) => {
                if (composer.kind === 'shared' || matchesTargets(set, composer.source)) {
                  form.setValue(
                    `${path}.${index}`,
                    {...set, ...targets},
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                }
              });
            }
            setComposer(null);
          }}
        />
      )}
    </div>
  );
}
