import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import type {NutritionPlanFormValues} from '@/pages/library/nutrition-plans/nutritionPlanFormTypes';

import MacrosFields from '@/components/MacrosFields';
import TagsInput from '@/components/TagsInput';

type NutritionPlanFormFieldsProps = {
  control: Control<NutritionPlanFormValues>;
  errors: FieldErrors<NutritionPlanFormValues>;
  isEditing: boolean;
  register: UseFormRegister<NutritionPlanFormValues>;
  setValue: UseFormSetValue<NutritionPlanFormValues>;
};

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

export default function NutritionPlanFormFields({
  control,
  errors,
  isEditing,
  register,
  setValue,
}: NutritionPlanFormFieldsProps) {
  const selectedType = useWatch({control, name: 'type'});
  const selectedStatus = useWatch({control, name: 'status'});

  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

        <TextField isInvalid={Boolean(errors.name?.message)}>
          <Label className="text-sm font-medium text-foreground">Name</Label>
          <Input
            placeholder="e.g. Fat Loss Starter"
            variant="secondary"
            {...register('name')}
          />
          {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
        </TextField>

        <TextField isInvalid={Boolean(errors.description?.message)}>
          <Label className="text-sm font-medium text-foreground">Description</Label>
          <TextArea
            placeholder="Optional plan notes"
            variant="secondary"
            {...register('description')}
          />
          {errors.description?.message ? <FieldError>{errors.description.message}</FieldError> : null}
        </TextField>
      </section>

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Plan setup</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Type</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="min-h-11"
                isDisabled={isEditing}
                onPress={() => setValue('type', 'template')}
                type="button"
                variant={selectedType === 'template' ? 'secondary' : 'outline'}
              >
                Template
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isEditing}
                onPress={() => setValue('type', 'personal')}
                type="button"
                variant={selectedType === 'personal' ? 'secondary' : 'outline'}
              >
                Personal
              </Button>
            </div>
            {isEditing ? <p className="text-xs text-muted">Type is locked after creation.</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(['draft', 'active', 'archived'] as const).map((status) => (
                <Button
                  className="min-h-11"
                  key={status}
                  onPress={() => setValue('status', status)}
                  type="button"
                  variant={selectedStatus === status ? 'secondary' : 'outline'}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
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
        <p className="text-sm font-semibold text-foreground">Macros goal</p>
        <MacrosFields
          errors={errors}
          register={register as unknown as Parameters<typeof MacrosFields>[0]['register']}
        />
      </section>
    </>
  );
}
