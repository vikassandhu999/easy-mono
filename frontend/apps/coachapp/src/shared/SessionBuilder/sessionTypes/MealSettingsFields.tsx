import {MultiSelect, NumberInput, Select, Stack, Switch, Textarea} from '@mantine/core';
import {Control, Controller} from 'react-hook-form';

import {SessionFormValues} from '../sessionForm';

interface MealSettingsFieldsProps {
  control: Control<SessionFormValues>;
}

export default function MealSettingsFields({control}: MealSettingsFieldsProps) {
  return (
    <Stack gap="sm">
      <Controller
        control={control}
        name="meal_settings.target_calories"
        render={({field, fieldState}) => (
          <NumberInput
            {...field}
            error={fieldState.error?.message}
            label="Target Calories"
            min={0}
            onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
            placeholder="2000"
            value={field.value ?? undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.meal_type"
        render={({field, fieldState}) => (
          <Select
            {...field}
            clearable
            data={['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout']}
            error={fieldState.error?.message}
            label="Meal Type"
            placeholder="Select meal type"
            value={field.value ?? null}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.preparation_time_minutes"
        render={({field, fieldState}) => (
          <NumberInput
            {...field}
            error={fieldState.error?.message}
            label="Preparation Time (minutes)"
            min={0}
            onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
            placeholder="30"
            value={field.value ?? undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.difficulty"
        render={({field, fieldState}) => (
          <Select
            {...field}
            clearable
            data={['easy', 'medium', 'hard']}
            error={fieldState.error?.message}
            label="Difficulty"
            placeholder="Select difficulty"
            value={field.value ?? null}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.meal_prep_friendly"
        render={({field}) => (
          <Switch
            checked={field.value ?? false}
            label="Meal Prep Friendly"
            onChange={(event) => field.onChange(event.currentTarget.checked)}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.dietary_restrictions"
        render={({field, fieldState}) => (
          <MultiSelect
            {...field}
            clearable
            data={field.value ?? []}
            error={fieldState.error?.message}
            label="Dietary Restrictions"
            placeholder="Add dietary restrictions"
            searchable
            value={field.value ?? []}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.allergen_warnings"
        render={({field, fieldState}) => (
          <MultiSelect
            {...field}
            clearable
            data={field.value ?? []}
            error={fieldState.error?.message}
            label="Allergen Warnings"
            placeholder="Add allergen warnings"
            searchable
            value={field.value ?? []}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.equipment_needed"
        render={({field, fieldState}) => (
          <MultiSelect
            {...field}
            clearable
            data={field.value ?? []}
            error={fieldState.error?.message}
            label="Equipment Needed"
            placeholder="Add equipment needed"
            searchable
            value={field.value ?? []}
          />
        )}
      />

      <Controller
        control={control}
        name="meal_settings.notes"
        render={({field, fieldState}) => (
          <Textarea
            {...field}
            autosize
            error={fieldState.error?.message}
            label="Coach Notes"
            maxRows={4}
            minRows={2}
            placeholder="Add notes about this meal..."
            value={field.value ?? ''}
          />
        )}
      />
    </Stack>
  );
}
