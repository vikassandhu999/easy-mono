import {MultiSelect, NumberInput, Stack, Textarea, TextInput} from '@mantine/core';
import {Control, Controller} from 'react-hook-form';

import {SessionFormValues} from '../sessionForm';

interface InstructionSettingsFieldsProps {
    control: Control<SessionFormValues>;
}

export default function InstructionSettingsFields({control}: InstructionSettingsFieldsProps) {
    return (
        <Stack gap="sm">
            <Controller
                control={control}
                name="instruction_settings.instruction_text"
                render={({field, fieldState}) => (
                    <Textarea
                        {...field}
                        autosize
                        error={fieldState.error?.message}
                        label="Instruction Text"
                        maxRows={6}
                        minRows={3}
                        placeholder="Enter detailed instructions..."
                        required
                        value={field.value ?? ''}
                    />
                )}
            />

            <Controller
                control={control}
                name="instruction_settings.estimated_duration_minutes"
                render={({field, fieldState}) => (
                    <NumberInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Estimated Duration (minutes)"
                        min={1}
                        onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                        placeholder="15"
                        value={field.value ?? undefined}
                    />
                )}
            />

            <Controller
                control={control}
                name="instruction_settings.media_urls"
                render={({field, fieldState}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={field.value ?? []}
                        error={fieldState.error?.message}
                        label="Media URLs"
                        placeholder="Add media URLs"
                        searchable
                        value={field.value ?? []}
                    />
                )}
            />

            <Controller
                control={control}
                name="instruction_settings.checklist_items"
                render={({field, fieldState}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={field.value ?? []}
                        error={fieldState.error?.message}
                        label="Checklist Items"
                        placeholder="Add checklist items"
                        searchable
                        value={field.value ?? []}
                    />
                )}
            />

            <Controller
                control={control}
                name="instruction_settings.reminder_text"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Reminder Text"
                        placeholder="Enter reminder text..."
                        value={field.value ?? ''}
                    />
                )}
            />
        </Stack>
    );
}
