import {Button, FieldError, Input, Label, ListBox, Select, TextArea, TextField} from '@heroui/react';
import {type Control, Controller, type FieldErrors, type UseFormSetValue, useWatch} from 'react-hook-form';

import type {Client} from '@/entities/clients/api/clients';
import type {TrainingPlanFormValues} from '@/features/library/training-plans/trainingPlanFormTypes';

import TrainingPlanAssignmentFields from '@/features/library/training-plans/TrainingPlanAssignmentFields';

type TrainingPlanFormFieldsProps = {
  clients: Client[];
  control: Control<TrainingPlanFormValues>;
  errors: FieldErrors<TrainingPlanFormValues>;
  isEditing: boolean;
  setValue: UseFormSetValue<TrainingPlanFormValues>;
};

export default function TrainingPlanFormFields({
  clients,
  control,
  errors,
  isEditing,
  setValue,
}: TrainingPlanFormFieldsProps) {
  const isTemplate = useWatch({control, name: 'is_template'});

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
      <Controller
        control={control}
        name="name"
        render={({field}) => (
          <TextField
            isInvalid={Boolean(errors.name?.message)}
            onBlur={field.onBlur}
            onChange={field.onChange}
            value={field.value}
          >
            <Label className="text-sm font-medium text-foreground">Name</Label>
            <Input
              placeholder="e.g. 12-Week Strength Base…"
              variant="secondary"
            />
            {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({field}) => (
          <TextField
            isInvalid={Boolean(errors.description?.message)}
            onBlur={field.onBlur}
            onChange={field.onChange}
            value={field.value}
          >
            <Label className="text-sm font-medium text-foreground">Description</Label>
            <TextArea
              placeholder="Optional plan notes…"
              variant="secondary"
            />
            {errors.description?.message ? <FieldError>{errors.description.message}</FieldError> : null}
          </TextField>
        )}
      />

      <div className="border-t border-separator" />

      {!isEditing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Type</Label>
            <div className="flex gap-2">
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('is_template', true)}
                type="button"
                variant={isTemplate ? 'secondary' : 'outline'}
              >
                Template
              </Button>
              <Button
                className="min-h-11 flex-1"
                onPress={() => setValue('is_template', false)}
                type="button"
                variant={!isTemplate ? 'secondary' : 'outline'}
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

      {!isTemplate ? (
        <TrainingPlanAssignmentFields
          clients={clients}
          control={control}
          errors={errors}
        />
      ) : null}
    </>
  );
}
