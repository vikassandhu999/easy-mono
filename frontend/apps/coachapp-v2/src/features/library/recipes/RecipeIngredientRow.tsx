import {
  Autocomplete,
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  SearchField,
  TextField,
  useFilter,
} from '@heroui/react';
import {Minus} from 'lucide-react';
import {type Control, Controller, type FieldErrors, type UseFormRegister} from 'react-hook-form';

import type {Food} from '@/entities/foods/api/foods';
import type {RecipeFormValues} from '@/features/library/recipes/recipeFormTypes';

type RecipeIngredientRowProps = {
  foods: Food[];
  form: {
    control: Control<RecipeFormValues>;
    errors: FieldErrors<RecipeFormValues>;
    register: UseFormRegister<RecipeFormValues>;
  };
  initialFood?: Food;
  numericStep: string;
  row: {
    id: string;
    index: number;
    onRemove: () => void;
    ref: (node: HTMLDivElement | null) => void;
    title: string;
  };
};

export default function RecipeIngredientRow({foods, form, initialFood, numericStep, row}: RecipeIngredientRowProps) {
  const {contains} = useFilter({sensitivity: 'base'});
  const {control, errors, register} = form;
  const {id, index, onRemove, ref, title} = row;
  const selectableFoods =
    initialFood && !foods.some((food) => food.id === initialFood.id) ? [initialFood, ...foods] : foods;

  return (
    <div
      className="rounded-lg border border-separator bg-surface-secondary p-3"
      ref={ref}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{title}</span>
        <Button
          aria-label="Remove ingredient"
          className="min-h-11 px-3"
          onPress={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Remove ingredient</span>
        </Button>
      </div>

      {errors.ingredients?.[index]?.food_id?.message ? (
        <p className="mb-2 text-xs text-danger">{errors.ingredients[index]?.food_id?.message}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name={`ingredients.${index}.food_id`}
          render={({field: controlledField}) => (
            <Autocomplete
              allowsEmptyCollection
              fullWidth
              onChange={(value) => controlledField.onChange(value?.toString() ?? '')}
              value={controlledField.value || null}
              variant="secondary"
            >
              <Label className="text-xs font-medium text-foreground">Food</Label>
              <Autocomplete.Trigger className="min-h-11">
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Search food..." />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    {selectableFoods.map((food) => (
                      <ListBox.Item
                        id={food.id}
                        key={`${id}-${food.id}`}
                        textValue={food.name}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{food.name}</span>
                          {food.category ? <span className="text-xs text-muted">{food.category}</span> : null}
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
          )}
        />

        <div className="grid grid-cols-3 gap-3">
          <TextField isInvalid={Boolean(errors.ingredients?.[index]?.amount?.message)}>
            <Label className="text-xs font-medium text-foreground">Amount</Label>
            <Input
              placeholder="1"
              step={numericStep}
              type="number"
              variant="secondary"
              {...register(`ingredients.${index}.amount`)}
            />
            {errors.ingredients?.[index]?.amount?.message ? (
              <FieldError>{errors.ingredients[index]?.amount?.message}</FieldError>
            ) : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.ingredients?.[index]?.unit?.message)}>
            <Label className="text-xs font-medium text-foreground">Unit</Label>
            <Input
              placeholder="cup"
              variant="secondary"
              {...register(`ingredients.${index}.unit`)}
            />
            {errors.ingredients?.[index]?.unit?.message ? (
              <FieldError>{errors.ingredients[index]?.unit?.message}</FieldError>
            ) : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.ingredients?.[index]?.weight_g?.message)}>
            <Label className="text-xs font-medium text-foreground">Weight (g)</Label>
            <Input
              placeholder="100"
              step={numericStep}
              type="number"
              variant="secondary"
              {...register(`ingredients.${index}.weight_g`)}
            />
            {errors.ingredients?.[index]?.weight_g?.message ? (
              <FieldError>{errors.ingredients[index]?.weight_g?.message}</FieldError>
            ) : null}
          </TextField>
        </div>
      </div>
    </div>
  );
}
