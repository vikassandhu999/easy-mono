import {MultiSelect, Select, Stack, Textarea, TextInput} from '@mantine/core';
import {Control, Controller} from 'react-hook-form';

import {SessionFormValues} from '../sessionForm';

interface MeasurementSettingsFieldsProps {
    control: Control<SessionFormValues>;
}

export default function MeasurementSettingsFields({control}: MeasurementSettingsFieldsProps) {
    return (
        <Stack gap="sm">
            <Controller
                control={control}
                name="measurement_settings.metric_keys"
                render={({field, fieldState}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={field.value ?? []}
                        error={fieldState.error?.message}
                        label="Metric Keys"
                        placeholder="Add metric keys to track"
                        required
                        searchable
                        value={field.value ?? []}
                    />
                )}
            />

            <Controller
                control={control}
                name="measurement_settings.measurement_instructions"
                render={({field, fieldState}) => (
                    <Textarea
                        {...field}
                        autosize
                        error={fieldState.error?.message}
                        label="Measurement Instructions"
                        maxRows={4}
                        minRows={2}
                        placeholder="How to take these measurements..."
                        value={field.value ?? ''}
                    />
                )}
            />

            <Controller
                control={control}
                name="measurement_settings.best_time_of_day"
                render={({field, fieldState}) => (
                    <Select
                        {...field}
                        clearable
                        data={['morning', 'afternoon', 'evening', 'before-bed', 'anytime']}
                        error={fieldState.error?.message}
                        label="Best Time of Day"
                        placeholder="Select best time"
                        value={field.value ?? null}
                    />
                )}
            />

            <Controller
                control={control}
                name="measurement_settings.frequency_recommendation"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Frequency Recommendation"
                        placeholder="e.g., Weekly, Daily"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Controller
                control={control}
                name="measurement_settings.reminder_text"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Reminder Text"
                        placeholder="Reminder for this measurement..."
                        value={field.value ?? ''}
                    />
                )}
            />
        </Stack>
    );
}
