import {Button, FieldError, Input, Label, ListBox, Select, TextArea, TextField} from '@heroui/react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import type {NutritionPlanFormValues} from '@/features/library/nutrition-plans/nutritionPlanFormTypes';

import MacrosFields from '@/shared/ui/forms/MacrosFields';
import TagsInput from '@/shared/ui/forms/TagsInput';

type NutritionPlanFormFieldsProps = {
  control: Control<NutritionPlanFormValues>;
  errors: FieldErrors<NutritionPlanFormValues>;
  isEditing: boolean;
  register: UseFormRegister<NutritionPlanFormValues>;
  setValue: UseFormSetValue<NutritionPlanFormValues>;
};

export default function NutritionPlanFormFields({
  control,
  errors,
  isEditing,
  register,
  setValue,
}: NutritionPlanFormFieldsProps) {
  const selectedType = useWatch({control, name: 'type'});

  const statusSelect = (
    <Controller
      control={control}
      name="status"
      render={({field}) => (
        <Select
          onSelectionChange={(key) => {
            if (key !== null) field.onChange(key.toString());
          }}
          selectedKey={field.value}
          variant="secondary"
        >
          <Label className="text-sm font-medium text-foreground">Status</Label>
          <Select.Trigger className="min-h-11 w-full">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item
                id="draft"
                textValue="Draft"
              >
                Draft
              </ListBox.Item>
              <ListBox.Item
                id="active"
                textValue="Active"
              >
                Active
              </ListBox.Item>
              <ListBox.Item
                id="archived"
                textValue="Archived"
              >
                Archived
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      )}
    />
  );

  return (
    <>
      <TextField isInvalid={Boolean(errors.name?.message)}>
        <Label className="text-sm font-medium text-foreground">Name</Label>
        <Input
          placeholder="e.g. Fat Loss Starter…"
          variant="secondary"
          {...register('name')}
        />
        {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
      </TextField>

      <TextField isInvalid={Boolean(errors.description?.message)}>
        <Label className="text-sm font-medium text-foreground">Description</Label>
        <TextArea
          placeholder="Optional plan notes…"
          variant="secondary"
          {...register('description')}
        />
        {errors.description?.message ? <FieldError>{errors.description.message}</FieldError> : null}
      </TextField>

      <div className="border-t border-separator" />

      {!isEditing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Type</Label>
            <div className="flex gap-2">
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('type', 'template')}
                type="button"
                variant={selectedType === 'template' ? 'secondary' : 'outline'}
              >
                Template
              </Button>
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('type', 'personal')}
                type="button"
                variant={selectedType === 'personal' ? 'secondary' : 'outline'}
              >
                Personal
              </Button>
            </div>
          </div>
          {statusSelect}
        </div>
      ) : (
        statusSelect
      )}

      <div className="border-t border-separator" />

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

      <div className="border-t border-separator" />

      <p className="text-sm font-semibold text-foreground">Macros goal</p>
      <MacrosFields
        errors={errors}
        register={register as unknown as Parameters<typeof MacrosFields>[0]['register']}
      />
    </>
  );
}
