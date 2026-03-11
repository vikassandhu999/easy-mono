import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import type {Food} from '@/entities/foods/api/foods';
import type {RecipeIngredient} from '@/entities/recipes/api/recipes';
import type {RecipeFormValues} from '@/features/library/recipes/recipeFormTypes';

import {RECIPE_NUMERIC_STEP} from '@/features/library/recipes/recipeFormSchema';
import RecipeIngredientsSection from '@/features/library/recipes/RecipeIngredientsSection';
import MacrosFields from '@/shared/ui/forms/MacrosFields';
import ServingSizeRows from '@/shared/ui/forms/ServingSizeRows';
import TagsInput from '@/shared/ui/forms/TagsInput';

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
  const serviceSizeType = useWatch({control, name: 'service_size_type'});

  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

        <TextField isInvalid={Boolean(errors.name?.message)}>
          <Label className="text-sm font-medium text-foreground">Recipe name</Label>
          <Input
            placeholder="e.g. High Protein Pancakes…"
            variant="secondary"
            {...register('name')}
          />
          {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
        </TextField>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField isInvalid={Boolean(errors.category?.message)}>
            <Label className="text-sm font-medium text-foreground">Category</Label>
            <Input
              placeholder="e.g. Breakfast…"
              variant="secondary"
              {...register('category')}
            />
            {errors.category?.message ? <FieldError>{errors.category.message}</FieldError> : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.source?.message)}>
            <Label className="text-sm font-medium text-foreground">Source</Label>
            <Input
              placeholder="e.g. Internal…"
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
              placeholder="Add tags (press Enter or comma)…"
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
              placeholder="e.g. 800…"
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
            placeholder="Optional prep instructions…"
            variant="secondary"
            {...register('instructions')}
          />
          {errors.instructions?.message ? <FieldError>{errors.instructions.message}</FieldError> : null}
        </TextField>
      </section>

      <RecipeIngredientsSection
        className={SECTION}
        control={control}
        errors={errors}
        foods={foods}
        initialIngredients={initialIngredients}
        register={register}
      />
    </>
  );
}
