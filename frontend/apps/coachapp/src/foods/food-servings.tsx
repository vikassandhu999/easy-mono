import {useState} from 'react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import type {FoodFields} from './food';

type Serving = FoodFields['serving_sizes'][number];
function positive(value: unknown) {
  return (
    (String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0) ||
    'Enter a number greater than zero.'
  );
}

export function FoodServings({form, isDisabled}: {form: UseFormReturn<FoodFields>; isDisabled: boolean}) {
  const {fields, append, remove, insert} = useFieldArray({control: form.control, name: 'serving_sizes'});
  const [removed, setRemoved] = useState<{index: number; value: Serving} | null>(null);
  function makeDefault(index: number) {
    for (const [position] of form.getValues('serving_sizes').entries()) {
      form.setValue(`serving_sizes.${position}.is_default`, position === index, {shouldDirty: true});
    }
  }
  return (
    <section
      className="space-y-4"
      aria-label="Serving sizes"
    >
      <div>
        <h2 className="text-xl font-bold">Serving sizes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add familiar portions, like 1 bowl weighing 40 g. The default is selected first in recipes and meal plans;
          grams remain available.
        </p>
      </div>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">This food uses gram portions.</p>}
      <div className="space-y-5">
        {fields.map((field, index) => {
          const isDefault = form.watch(`serving_sizes.${index}.is_default`);
          const name = form.watch(`serving_sizes.${index}.label`) || `Serving ${index + 1}`;
          return (
            <fieldset
              key={field.id}
              className="min-w-0 space-y-3 rounded-xl bg-muted/50 p-4"
              disabled={isDisabled}
            >
              <legend className="sr-only">Serving {index + 1}</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  isDisabled={isDisabled || isDefault}
                  aria-label={isDefault ? `${name} is the default serving` : `Make ${name} the default serving`}
                  onPress={() => makeDefault(index)}
                >
                  {isDefault ? 'Default serving' : 'Make default'}
                </Button>
                <Button
                  variant="ghost"
                  isDisabled={isDisabled}
                  aria-label={`Remove ${name}`}
                  onPress={() => {
                    setRemoved({index, value: form.getValues(`serving_sizes.${index}`)});
                    remove(index);
                    if (isDefault && form.getValues('serving_sizes').length > 0) {
                      makeDefault(0);
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
              <FormField
                control={form.control}
                name={`serving_sizes.${index}.label`}
                label="Serving name"
                isRequired
                rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter a serving name.'}}
              />
              <div className="grid grid-cols-3 items-start gap-3">
                <FormField
                  control={form.control}
                  name={`serving_sizes.${index}.amount`}
                  label="Amount"
                  inputMode="decimal"
                  isRequired
                  rules={{validate: positive}}
                />
                <FormField
                  control={form.control}
                  name={`serving_sizes.${index}.unit`}
                  label="Unit"
                  isRequired
                  rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter a unit, such as bowl or slice.'}}
                />
                <FormField
                  control={form.control}
                  name={`serving_sizes.${index}.weight_g`}
                  label="Weight · g"
                  inputMode="decimal"
                  isRequired
                  rules={{validate: positive}}
                />
              </div>
            </fieldset>
          );
        })}
      </div>
      {removed && (
        <div
          className="flex flex-wrap items-center gap-3"
          role="status"
        >
          <span className="text-sm">{removed.value.label || 'Serving'} removed from this draft.</span>
          <Button
            variant="ghost"
            isDisabled={isDisabled}
            onPress={() => {
              if (removed.value.is_default) {
                makeDefault(-1);
              }
              insert(Math.min(removed.index, fields.length), {
                ...removed.value,
                is_default: removed.value.is_default || fields.length === 0,
              });
              setRemoved(null);
            }}
          >
            Undo removal
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        isDisabled={isDisabled}
        onPress={() => append({label: '', amount: '1', unit: 'serving', weight_g: '', is_default: fields.length === 0})}
      >
        Add serving size
      </Button>
    </section>
  );
}
