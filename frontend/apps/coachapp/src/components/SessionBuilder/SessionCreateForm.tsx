import {Divider, Group, MultiSelect, NumberInput, Stack, Switch, Textarea, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';

import {CreateSession} from '@/api/sessions';
import {FixedBottom} from '@/components/containers/FixedBottom';
import PaddingContainer from '@/components/containers/PaddingContainer';

import {getSessionTypeConfig} from '../PlanBuilder/sessionTypes';

interface SessionCreateFormProps {
    isSubmitting?: boolean;
    onSubmit: (values: CreateSession) => Promise<void>;
    sessionType: CreateSession['session_type'];
}

export default function SessionCreateForm({isSubmitting = false, onSubmit, sessionType}: SessionCreateFormProps) {
    const typeConfig = getSessionTypeConfig(sessionType);

    const form = useForm<CreateSession>({
        initialValues: {
            description: '',
            duration_minutes: 30,
            meal_settings:
                sessionType === 'meal'
                    ? {
                          meal_prep_friendly: false,
                          equipment_needed: [],
                          dietary_restrictions: [],
                          allergen_warnings: [],
                          notes: '',
                      }
                    : undefined,
            name: '',
            session_type: sessionType,
            workout_settings:
                sessionType === 'workout'
                    ? {
                          warm_up_required: true,
                          cool_down_required: true,
                          default_rest_seconds: 60,
                          focus_areas: [],
                          equipment_needed: [],
                          notes: '',
                      }
                    : undefined,
        },
        transformValues(values) {
            const payload: CreateSession = {...values};

            if (payload.session_type !== 'workout') {
                delete (payload as Partial<CreateSession>).workout_settings;
            }
            if (payload.session_type !== 'meal') {
                delete (payload as Partial<CreateSession>).meal_settings;
            }
            if (payload.session_type !== 'instruction') {
                delete (payload as Partial<CreateSession>).instruction_settings;
            }
            if (payload.session_type !== 'measurement') {
                delete (payload as Partial<CreateSession>).measurement_settings;
            }
            if (!payload.duration_minutes) {
                delete (payload as Partial<CreateSession>).duration_minutes;
            }

            return payload;
        },
        validate: {
            duration_minutes: (value) => {
                if (!value || value < 1) return 'Duration must be at least 1 minute';
                if (value > 480) return 'Duration cannot exceed 480 minutes (8 hours)';
                return null;
            },
            name: (value) => (!value || value.trim().length === 0 ? 'Name is required' : null),
        },
    });

    const workoutSection = sessionType === 'workout' && (
        <Stack gap={'sm'}>
            <Divider
                label="Workout Details"
                labelPosition="left"
            />
            <Group grow>
                <Switch
                    checked={form.values.workout_settings?.warm_up_required ?? false}
                    label="Include Warm-up"
                    onChange={(e) => form.setFieldValue('workout_settings.warm_up_required', e.currentTarget.checked)}
                />
                <Switch
                    checked={form.values.workout_settings?.cool_down_required ?? false}
                    label="Include Cool-down"
                    onChange={(e) => form.setFieldValue('workout_settings.cool_down_required', e.currentTarget.checked)}
                />
            </Group>
            <Group grow>
                <NumberInput
                    label="Default Rest (seconds)"
                    max={3600}
                    min={0}
                    onChange={(value) => {
                        const numericValue = typeof value === 'number' ? value : Number(value);
                        form.setFieldValue(
                            'workout_settings.default_rest_seconds',
                            Number.isFinite(numericValue) ? numericValue : 0,
                        );
                    }}
                    value={form.values.workout_settings?.default_rest_seconds ?? 0}
                />
                <MultiSelect
                    data={form.values.workout_settings?.focus_areas || []}
                    label="Focus Areas"
                    onChange={(val) => form.setFieldValue('workout_settings.focus_areas', val)}
                    placeholder="Add focus areas"
                    searchable
                    value={form.values.workout_settings?.focus_areas || []}
                />
            </Group>
            <MultiSelect
                data={form.values.workout_settings?.equipment_needed || []}
                label="Equipment Needed"
                onChange={(val) => form.setFieldValue('workout_settings.equipment_needed', val)}
                placeholder="Add equipment"
                searchable
                value={form.values.workout_settings?.equipment_needed || []}
            />
            <Textarea
                autosize
                label="Coach Notes"
                minRows={2}
                onChange={(e) => form.setFieldValue('workout_settings.notes', e.currentTarget.value)}
                placeholder="General session notes"
                value={form.values.workout_settings?.notes || ''}
            />
        </Stack>
    );

    const mealSection = sessionType === 'meal' && (
        <Stack gap={'sm'}>
            <Divider
                label="Meal Details"
                labelPosition="left"
            />
            <Switch
                checked={form.values.meal_settings?.meal_prep_friendly ?? false}
                label="Meal Prep Friendly"
                onChange={(e) => form.setFieldValue('meal_settings.meal_prep_friendly', e.currentTarget.checked)}
            />
            <MultiSelect
                data={form.values.meal_settings?.equipment_needed || []}
                label="Equipment Needed"
                onChange={(val) => form.setFieldValue('meal_settings.equipment_needed', val)}
                placeholder="Add equipment"
                searchable
                value={form.values.meal_settings?.equipment_needed || []}
            />
            <MultiSelect
                data={form.values.meal_settings?.dietary_restrictions || []}
                label="Dietary Restrictions"
                onChange={(val) => form.setFieldValue('meal_settings.dietary_restrictions', val)}
                placeholder="Add restrictions"
                searchable
                value={form.values.meal_settings?.dietary_restrictions || []}
            />
            <MultiSelect
                data={form.values.meal_settings?.allergen_warnings || []}
                label="Allergen Warnings"
                onChange={(val) => form.setFieldValue('meal_settings.allergen_warnings', val)}
                placeholder="Add allergens"
                searchable
                value={form.values.meal_settings?.allergen_warnings || []}
            />
            <Textarea
                autosize
                label="Coach Notes"
                minRows={2}
                onChange={(e) => form.setFieldValue('meal_settings.notes', e.currentTarget.value)}
                placeholder="General session notes"
                value={form.values.meal_settings?.notes || ''}
            />
        </Stack>
    );

    return (
        <PaddingContainer
            paddingX={'sm'}
            paddingY={'lg'}
        >
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap={'md'}>
                    <TextInput
                        label="Name"
                        placeholder={`Enter ${typeConfig?.label.toLowerCase()} name`}
                        required
                        size={'md'}
                        {...form.getInputProps('name')}
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                    />
                    {/* Duration */}
                    <NumberInput
                        label="Duration (minutes)"
                        max={480}
                        min={1}
                        placeholder="30"
                        size={'md'}
                        {...form.getInputProps('duration_minutes')}
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                    />
                    {workoutSection}
                    {mealSection}
                    <FixedBottom
                        isSubmitting={form.submitting || isSubmitting}
                        label={`Create ${typeConfig?.label}`}
                    />
                </Stack>
            </form>
        </PaddingContainer>
    );
}
