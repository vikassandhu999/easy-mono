import {useState} from 'react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {IngredientPicker} from './ingredient-picker';
import {ingredientDraft, positive, type RecipeFields} from './recipe';

export function Ingredients({form, disabled}: {form: UseFormReturn<RecipeFields>; disabled: boolean}) {
  const {fields, append, remove, insert} = useFieldArray({control: form.control, name: 'ingredients'});
  const [picking, setPicking] = useState(false);
  const [removed, setRemoved] = useState<{item: RecipeFields['ingredients'][number]; index: number}>();
  return (
    <section
      className="space-y-4"
      aria-labelledby="ingredients-heading"
    >
      <div>
        <h2
          id="ingredients-heading"
          className="text-xl font-bold"
        >
          Ingredients
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter quantities for the whole recipe, before dividing it into servings.
        </p>
      </div>
      {fields.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">Start with the foods that go into this recipe.</p>
      )}
      <ol
        className="space-y-6"
        aria-label="Recipe ingredients"
      >
        {fields.map((item, index) => {
          const portion = form.watch(`ingredients.${index}.portion`);
          const options = item.food?.portion_options ?? [portion];
          const key = (value: typeof portion) =>
            value.kind === 'gram' ? 'gram' : JSON.stringify([value.unit, value.label]);
          return (
            <li
              key={item.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] sm:items-end"
            >
              <div className="flex min-w-0 items-center justify-between gap-3 sm:pb-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{item.food?.name ?? 'Unavailable food'}</h3>
                  {item.food?.brand && <p className="text-xs text-muted-foreground">{item.food.brand}</p>}
                </div>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3 sm:col-start-2 sm:row-start-1 sm:grid-cols-[8rem_10rem]">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.amount`}
                  label="Quantity"
                  inputMode="decimal"
                  rules={{validate: positive}}
                />
                <div className="grid content-start gap-2">
                  <span
                    id={`unit-${item.id}-label`}
                    className="text-sm font-medium"
                  >
                    Unit
                  </span>
                  <SelectField
                    id={`unit-${item.id}`}
                    aria-label={`Unit · ${item.food?.name ?? 'ingredient'}`}
                    value={key(portion)}
                    isDisabled={disabled}
                    onChange={(selected) => {
                      const next = options.find((option) => key(option) === selected);
                      if (next) {
                        form.setValue(`ingredients.${index}.portion`, next, {shouldDirty: true});
                        form.setValue(
                          `ingredients.${index}.amount`,
                          String(next.kind === 'gram' ? next.grams : next.amount),
                          {shouldDirty: true, shouldValidate: true},
                        );
                      }
                    }}
                  >
                    {options.map((option) => (
                      <SelectItem
                        key={key(option)}
                        id={key(option)}
                        textValue={option.kind === 'gram' ? 'Grams' : (option.label ?? option.unit)}
                      >
                        {option.kind === 'gram' ? 'Grams' : (option.label ?? option.unit)}
                      </SelectItem>
                    ))}
                  </SelectField>
                </div>
              </div>
              <Button
                variant="ghost"
                className="col-start-2 row-start-1 w-fit sm:col-start-4"
                isDisabled={disabled}
                aria-label={`Remove ${item.food?.name ?? 'ingredient'}`}
                onPress={() => {
                  setRemoved({item: form.getValues(`ingredients.${index}`), index});
                  remove(index);
                }}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ol>
      {removed && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="status"
        >
          <p className="text-sm">Removed {removed.item.food?.name ?? 'ingredient'}.</p>
          <Button
            variant="ghost"
            isDisabled={disabled}
            onPress={() => {
              insert(Math.min(removed.index, fields.length), removed.item);
              setRemoved(undefined);
            }}
          >
            Undo
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        isDisabled={disabled}
        onPress={() => setPicking(true)}
      >
        Add ingredients
      </Button>
      {picking && (
        <IngredientPicker
          onClose={() => setPicking(false)}
          onAdd={(foods) => {
            append(
              foods.map((food) => ingredientDraft(food, food.id, food.default_portion)),
              {shouldFocus: false},
            );
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
