import {type UseFormReturn, useFieldArray} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import type {FoodFields} from './food';

export function FoodServings({form, isDisabled}: {form: UseFormReturn<FoodFields>; isDisabled: boolean}) {
  const {fields, append, remove} = useFieldArray({control: form.control, name: 'servings', keyName: 'key'});
  const defaultId = form.watch('default_serving_id');
  return (
    <section className="editor-section space-y-4">
      <h2 className="editor-section-title">Serving sizes</h2>
      <p className="text-sm text-muted-foreground">
        Give each serving a name and its weight in grams. Names can change without changing the serving identity.
      </p>
      {fields.map((serving, index) => (
        <fieldset
          key={serving.key}
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
            />
            <FormField
              control={form.control}
              name={`servings.${index}.grams`}
              label="Weight · g"
              inputMode="decimal"
              rules={{validate: (value) => Number(value) > 0 || 'Enter a positive weight.'}}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              aria-pressed={defaultId === serving.id}
              onPress={() => form.setValue('default_serving_id', serving.id, {shouldDirty: true})}
            >
              {defaultId === serving.id ? 'Default serving' : 'Use as default'}
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                remove(index);
                if (defaultId === serving.id) {
                  form.setValue('default_serving_id', '', {shouldDirty: true});
                }
              }}
            >
              Remove serving
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        variant="outline"
        isDisabled={isDisabled}
        onPress={() => {
          const id = crypto.randomUUID();
          append({id, label: '', grams: ''});
          if (!fields.length) {
            form.setValue('default_serving_id', id, {shouldDirty: true});
          }
        }}
      >
        Add serving size
      </Button>
    </section>
  );
}
