import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useFood} from '../api/foods';
import type {NutritionMealItem, NutritionPortion} from '../api/nutrition-plans';
import {useRecipe} from '../api/recipes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function PortionEditor({
  item,
  onApply,
  onClose,
}: {
  item: NutritionMealItem;
  onApply: (portion: NutritionPortion) => void;
  onClose: () => void;
}) {
  const food = useFood(item.kind === 'food' ? (item.food_id ?? '') : '');
  const recipe = useRecipe(item.kind === 'recipe' ? (item.recipe_id ?? '') : '');
  const query = item.kind === 'food' ? food : recipe;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Change portion</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="break-words font-semibold">{item.name || 'Meal item'}</p>
        {query.isError ? (
          <div className="space-y-3">
            <FormError message="Could not load available portions. Your meal is unchanged." />
            <Button
              variant="outline"
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}
        {query.data ? (
          <PortionForm
            item={item}
            options={query.data.data.portion_options}
            onApply={onApply}
            onClose={onClose}
          />
        ) : !query.isError ? (
          <p
            role="status"
            className="min-h-40 text-sm text-muted-foreground"
          >
            Loading available portions…
          </p>
        ) : null}
        {!query.data && (
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Cancel
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function portionKey(portion: NutritionPortion) {
  return portion.kind === 'gram' ? 'gram' : JSON.stringify([portion.unit, portion.label]);
}

function PortionForm({
  item,
  options,
  onApply,
  onClose,
}: {
  item: NutritionMealItem;
  options: NutritionPortion[];
  onApply: (portion: NutritionPortion) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(portionKey(item.portion));
  const portion = options.find((option) => portionKey(option) === selected);
  const form = useForm({
    defaultValues: {amount: String(item.portion.kind === 'gram' ? item.portion.grams : item.portion.amount)},
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.stopPropagation();
        form.handleSubmit(({amount}) => {
          if (portion) {
            onApply(
              portion.kind === 'gram' ? {...portion, grams: Number(amount)} : {...portion, amount: Number(amount)},
            );
          }
        })(event);
      }}
    >
      <div className="grid gap-2">
        <label
          id="meal-portion-unit-label"
          htmlFor="meal-portion-unit"
          className="text-sm font-medium"
        >
          Portion type
        </label>
        <SelectField
          id="meal-portion-unit"
          value={portion ? selected : ''}
          onChange={(key) => {
            const next = options.find((option) => portionKey(option) === key);
            if (next) {
              setSelected(key);
              form.setValue('amount', String(next.kind === 'gram' ? next.grams : next.amount), {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          }}
        >
          {options.map((option) => (
            <SelectItem
              key={portionKey(option)}
              id={portionKey(option)}
            >
              {option.kind === 'gram' ? 'Grams' : option.label || option.unit}
            </SelectItem>
          ))}
        </SelectField>
        {!portion && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            Choose an available portion type.
          </p>
        )}
      </div>
      <FormField
        control={form.control}
        name="amount"
        label={portion?.kind === 'gram' ? 'Grams' : 'Quantity'}
        inputMode="decimal"
        isRequired
        rules={{
          validate: (value) =>
            (Number.isFinite(Number(value)) && Number(value) > 0) || 'Enter a quantity greater than zero.',
        }}
      />
      <p className="text-sm text-muted-foreground">
        Changing the portion type starts with its standard quantity. Adjust it before applying.
      </p>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isDisabled={!portion}
        >
          Apply portion
        </Button>
      </div>
    </form>
  );
}
