import {useState} from 'react';
import {type UseFormReturn, useFieldArray} from 'react-hook-form';
import {useFood} from '../api/foods';
import {defaultPortion, portionOptions} from '../api/nutrition-values';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {IngredientPicker} from './ingredient-picker';
import {ingredientDraft, positive, type RecipeFields} from './recipe';

export function Ingredients({form, disabled}: {form: UseFormReturn<RecipeFields>; disabled: boolean}) {
  const {fields, append, remove, insert} = useFieldArray({control: form.control, name: 'ingredients'});
  const [picking, setPicking] = useState(false);
  const [removed, setRemoved] = useState<{index: number; item: RecipeFields['ingredients'][number]}>();
  return (
    <section className="editor-section space-y-4">
      <h2 className="editor-section-title">Ingredients</h2>
      <p className="text-sm text-muted-foreground">Enter quantities for the whole recipe.</p>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">Add the foods in this recipe.</p>}
      <ol
        className="space-y-5"
        aria-label="Recipe ingredients"
      >
        {fields.map((item, index) => (
          <Ingredient
            key={item.id}
            form={form}
            index={index}
            disabled={disabled}
            onRemove={() => {
              setRemoved({index, item: form.getValues(`ingredients.${index}`)});
              remove(index);
            }}
          />
        ))}
      </ol>
      {removed && (
        <div
          className="flex items-center gap-3"
          role="status"
        >
          <p className="text-sm">Ingredient removed.</p>
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
              foods.map((food) => ingredientDraft(food, food.id, defaultPortion(food))),
              {shouldFocus: false},
            );
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
function Ingredient({
  form,
  index,
  disabled,
  onRemove,
}: {
  form: UseFormReturn<RecipeFields>;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const item = form.watch(`ingredients.${index}`);
  const query = useFood(item.food_id);
  const food = item.food ?? query.data?.data;
  const options = food ? portionOptions(food) : [{label: 'Saved portion', portion: item.portion}];
  const key = (portion: typeof item.portion) => (portion.type === 'grams' ? 'grams' : portion.serving_id);
  return (
    <li className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="editor-item-title">{food?.name ?? (query.isError ? 'Food unavailable' : 'Loading food…')}</h3>
        <Button
          variant="ghost"
          isDisabled={disabled}
          aria-label={`Remove ${food?.name ?? 'ingredient'}`}
          onPress={onRemove}
        >
          Remove ingredient
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`ingredients.${index}.amount`}
          label="Quantity"
          inputMode="decimal"
          rules={{validate: positive}}
        />
        <div className="grid content-start gap-2">
          <span className="text-sm font-medium">Portion type</span>
          <SelectField
            aria-label={`Portion type · ${food?.name ?? 'ingredient'}`}
            value={key(item.portion)}
            isDisabled={disabled}
            onChange={(selected) => {
              const option = options.find((value) => key(value.portion) === selected);
              if (option) {
                form.setValue(`ingredients.${index}.portion`, option.portion, {shouldDirty: true});
                form.setValue(
                  `ingredients.${index}.amount`,
                  String(option.portion.type === 'grams' ? option.portion.grams : option.portion.amount),
                  {shouldDirty: true},
                );
              }
            }}
          >
            {options.map((option) => (
              <SelectItem
                key={key(option.portion)}
                id={key(option.portion)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
        </div>
      </div>
    </li>
  );
}
