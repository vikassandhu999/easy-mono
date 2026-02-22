import type {Control, FieldErrors, UseFormRegister} from 'react-hook-form';

import {FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {Controller} from 'react-hook-form';

import type {FoodFormValues} from '@/pages/library/foods/foodFormTypes';

import MacrosFields from '@/components/MacrosFields';
import ServingSizeRows from '@/components/ServingSizeRows';
import TagsInput from '@/components/TagsInput';
import {FOOD_NUMERIC_STEP} from '@/pages/library/foods/foodFormSchema';

type FoodFormFieldsProps = {
  control: Control<FoodFormValues>;
  errors: FieldErrors<FoodFormValues>;
  register: UseFormRegister<FoodFormValues>;
};

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

export default function FoodFormFields({control, errors, register}: FoodFormFieldsProps) {
  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

        <TextField isInvalid={Boolean(errors.name?.message)}>
          <Label className="text-sm font-medium text-foreground">Food name</Label>
          <Input
            placeholder="e.g. Rolled Oats"
            variant="secondary"
            {...register('name')}
          />
          {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
        </TextField>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField isInvalid={Boolean(errors.category?.message)}>
            <Label className="text-sm font-medium text-foreground">Category</Label>
            <Input
              placeholder="e.g. Grain"
              variant="secondary"
              {...register('category')}
            />
            {errors.category?.message ? <FieldError>{errors.category.message}</FieldError> : null}
          </TextField>

          <TextField isInvalid={Boolean(errors.source?.message)}>
            <Label className="text-sm font-medium text-foreground">Source</Label>
            <Input
              placeholder="e.g. USDA"
              variant="secondary"
              {...register('source')}
            />
            {errors.source?.message ? <FieldError>{errors.source.message}</FieldError> : null}
          </TextField>
        </div>
      </section>

      <section className={SECTION}>
        <TextField isInvalid={Boolean(errors.notes?.message)}>
          <Label className="text-sm font-medium text-foreground">Notes</Label>
          <TextArea
            placeholder="Optional notes"
            variant="secondary"
            {...register('notes')}
          />
          {errors.notes?.message ? <FieldError>{errors.notes.message}</FieldError> : null}
        </TextField>
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
            placeholder="https://example.com/food.jpg"
            variant="secondary"
            {...register('image_url')}
          />
          {errors.image_url?.message ? <FieldError>{errors.image_url.message}</FieldError> : null}
        </TextField>
      </section>

      <ServingSizeRows
        control={control}
        errors={errors}
        register={register}
        title="Serving sizes"
      />

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Macros</p>
        <MacrosFields
          errors={errors}
          register={register as unknown as Parameters<typeof MacrosFields>[0]['register']}
          step={Number(FOOD_NUMERIC_STEP)}
        />
      </section>
    </>
  );
}
