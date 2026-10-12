import {useEffect, useRef, useState} from 'react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {basisUnit, type FoodFields} from './food';

export function FoodServings({form, isDisabled}: {form: UseFormReturn<FoodFields>; isDisabled: boolean}) {
  const {fields, append, remove, insert} = useFieldArray({control: form.control, name: 'servings'});
  const [removed, setRemoved] = useState<{index: number; serving: FoodFields['servings'][number]} | null>(null);
  const undo = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (removed) {
      undo.current?.focus();
    }
  }, [removed]);
  const unit = basisUnit(form.watch('basis'), form.watch('unit_label'));
  return (
    <section className="editor-section space-y-4">
      <h2 className="editor-section-title">Serving sizes</h2>
      <p className="text-sm text-muted-foreground">Optional names for amounts in {unit}, such as a cup or scoop.</p>
      {fields.map((serving, index) => (
        <fieldset
          key={serving.id}
          disabled={isDisabled}
          className="space-y-3"
        >
          <legend className="editor-item-title">Serving {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`servings.${index}.label`}
              label="Serving name"
              isRequired
              rules={{validate: (value) => Boolean(String(value ?? '').trim()) || 'Enter a serving name.'}}
            />
            <FormField
              control={form.control}
              name={`servings.${index}.amount`}
              label={`Amount · ${unit}`}
              inputMode="decimal"
              isRequired
              rules={{
                validate: (value) =>
                  (Number.isFinite(Number(value)) && Number(value) > 0) || 'Enter a positive amount.',
              }}
            />
          </div>
          <Button
            variant="ghost"
            isDisabled={isDisabled}
            onPress={() => {
              const saved = form.getValues(`servings.${index}`);
              remove(index);
              setRemoved({index, serving: saved});
            }}
          >
            Remove serving
          </Button>
        </fieldset>
      ))}
      {removed && (
        <div
          role="status"
          className="flex items-center gap-3 text-sm"
        >
          Serving removed.
          <Button
            ref={undo}
            variant="ghost"
            isDisabled={isDisabled}
            onPress={() => {
              insert(removed.index, removed.serving);
              setRemoved(null);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        isDisabled={isDisabled}
        onPress={() => append({label: '', amount: ''})}
      >
        Add serving size
      </Button>
    </section>
  );
}
