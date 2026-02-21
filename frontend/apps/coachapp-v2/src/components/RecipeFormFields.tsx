import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {useRef} from 'react';
import {
  type Control,
  Controller,
  type FieldErrors,
  useFieldArray,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import type {Food} from '@/api/foods';
import type {RecipeIngredient} from '@/api/recipes';
import type {RecipeFormValues} from '@/pages/library/recipeFormTypes';

import MacrosFields from '@/components/MacrosFields';
import {createEmptyIngredient, RECIPE_NUMERIC_STEP} from '@/pages/library/recipeFormSchema';
import RecipeIngredientRow from '@/pages/library/RecipeIngredientRow';
import ServingSizeRows from '@/pages/library/ServingSizeRows';
import TagsInput from '@/pages/library/TagsInput';

type RecipeFormFieldsProps = {
  control: Control<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
  foods: Food[];
  initialIngredients?: RecipeIngredient[];
  register: UseFormRegister<RecipeFormValues>;
  setValue: UseFormSetValue<RecipeFormValues>;
};

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

export default function RecipeFormFields({
  control,
  errors,
  foods,
  initialIngredients,
  register,
  setValue,
}: RecipeFormFieldsProps) {
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const serviceSizeType = useWatch({control, name: 'service_size_type'});
  const {fields, append, remove} = useFieldArray({
    control,
    name: 'ingredients',
  });

  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

        <TextField isInvalid={Boolean(errors.name?.message)}>
          <Label className="text-sm font-medium text-foreground">Recipe name</Label>
          <Input
            placeholder="e.g. High Protein Pancakes"
            variant="secondary"
            {...register('name')}
          />
          {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
        </TextField>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField isInvalid={Boolean(errors.category?.message)}>
            <Label className="text-sm font-medium text-foreground">Category</Label>
            <Input
              placeholder="e.g. Breakfast"
              variant="secondary"
              {...register('category')}
            />
            {errors.category?.message ? <FieldError>{errors.category.message}</FieldError> : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.source?.message)}>
            <Label className="text-sm font-medium text-foreground">Source</Label>
            <Input
              placeholder="e.g. Internal"
              variant="secondary"
              {...register('source')}
            />
            {errors.source?.message ? <FieldError>{errors.source.message}</FieldError> : null}
          </TextField>
        </div>
      </section>

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Macros</p>
        <MacrosFields
          errors={errors}
          register={register as unknown as Parameters<typeof MacrosFields>[0]['register']}
          step={Number(RECIPE_NUMERIC_STEP)}
        />
      </section>

      <section className={SECTION}>
        <Controller
          control={control}
          name="tags"
          render={({field}) => (
            <TagsInput
              label="Tags"
              onChange={(nextTags) => field.onChange(nextTags)}
              placeholder="Add tags (press Enter or comma)"
              value={field.value}
            />
          )}
        />
      </section>

      <section className={SECTION}>
        <TextField isInvalid={Boolean(errors.image_url?.message)}>
          <Label className="text-sm font-medium text-foreground">Image URL</Label>
          <Input
            placeholder="https://example.com/recipe.jpg"
            variant="secondary"
            {...register('image_url')}
          />
          {errors.image_url?.message ? <FieldError>{errors.image_url.message}</FieldError> : null}
        </TextField>
      </section>

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Serving configuration</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="min-h-11"
            onPress={() => setValue('service_size_type', 'serving_based')}
            type="button"
            variant={serviceSizeType === 'serving_based' ? 'secondary' : 'outline'}
          >
            Serving based
          </Button>
          <Button
            className="min-h-11"
            onPress={() => setValue('service_size_type', 'weight_based')}
            type="button"
            variant={serviceSizeType === 'weight_based' ? 'secondary' : 'outline'}
          >
            Weight based
          </Button>
        </div>
        {serviceSizeType === 'weight_based' ? (
          <TextField isInvalid={Boolean(errors.cooked_weight_g?.message)}>
            <Label className="text-sm font-medium text-foreground">Cooked weight (g)</Label>
            <Input
              placeholder="e.g. 800"
              step={RECIPE_NUMERIC_STEP}
              type="number"
              variant="secondary"
              {...register('cooked_weight_g')}
            />
            {errors.cooked_weight_g?.message ? <FieldError>{errors.cooked_weight_g.message}</FieldError> : null}
          </TextField>
        ) : null}
      </section>

      <ServingSizeRows
        control={control}
        errors={errors}
        register={register}
        title="Serving sizes"
      />

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Instructions</p>

        <TextField isInvalid={Boolean(errors.instructions?.message)}>
          <Label className="text-sm font-medium text-foreground">Instructions</Label>
          <TextArea
            placeholder="Optional prep instructions"
            variant="secondary"
            {...register('instructions')}
          />
          {errors.instructions?.message ? <FieldError>{errors.instructions.message}</FieldError> : null}
        </TextField>
      </section>

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Ingredients</p>

        <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
          <div>
            <p className="text-sm font-medium text-foreground">Ingredients</p>
            <p className="text-xs text-muted">
              {fields.length} ingredient
              {fields.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            className="min-h-11 gap-1 px-3"
            onPress={() => append(createEmptyIngredient())}
            size="sm"
            type="button"
            variant="outline"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add ingredient</span>
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium text-foreground">No ingredients yet</p>
              <p className="text-xs text-muted">Add your first ingredient to build this recipe.</p>
              <Button
                className="min-h-11 gap-1 px-3"
                onPress={() => append(createEmptyIngredient())}
                size="sm"
                type="button"
                variant="outline"
              >
                <span className="text-lg leading-none">+</span>
                <span>Add ingredient</span>
              </Button>
            </div>
          </div>
        ) : null}

        {fields.map((field, index) => (
          <RecipeIngredientRow
            foods={foods}
            form={{control, errors, register}}
            initialFood={initialIngredients?.[index]?.food}
            key={field.id}
            numericStep={RECIPE_NUMERIC_STEP}
            row={{
              id: field.id,
              index,
              onRemove: () => remove(index),
              ref: (node) => {
                rowRefs.current[index] = node;
              },
              title: `Ingredient ${index + 1}`,
            }}
          />
        ))}
      </section>
    </>
  );
}
