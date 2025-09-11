import {Divider, Group, MultiSelect, NumberInput, Stack, Switch, Textarea, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';

import {CreateSessionDef, SessionType} from '@/api/session_defs.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import PaddingContainer from '@/components/containers/PaddingContainer';

import {SESSION_TYPE_CONFIG} from '../ScheduleBuilder/sessionTypeConfig';

interface SessionCreateFormProps {
    onSubmit: (values: CreateSessionDef) => Promise<void>;
    sessionType: SessionType;
}

export default function SessionCreateForm({onSubmit, sessionType}: SessionCreateFormProps) {
    const typeConfig = SESSION_TYPE_CONFIG[sessionType] || SESSION_TYPE_CONFIG.other;

    const form = useForm<CreateSessionDef & {meal_metadata?: any; workout_metadata?: any}>({
        initialValues: {
            description: '',
            duration_minutes: 30,
            meal_metadata: sessionType === 'meal' ? {meal_prep_friendly: false} : undefined,
            name: '',
            session_type: sessionType,
            workout_metadata: sessionType === 'workout' ? {cooldown_included: true, warmup_included: true} : undefined,
        },
        transformValues(values) {
            // Remove irrelevant metadata before submit
            const v: any = {...values};
            if (sessionType === 'workout') {
                delete v.meal_metadata;
            } else {
                delete v.workout_metadata;
            }
            return v;
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
                    checked={form.values.workout_metadata?.warmup_included || false}
                    label="Include Warm-up"
                    onChange={(e) => form.setFieldValue('workout_metadata.warmup_included', e.currentTarget.checked)}
                />
                <Switch
                    checked={form.values.workout_metadata?.cooldown_included || false}
                    label="Include Cool-down"
                    onChange={(e) => form.setFieldValue('workout_metadata.cooldown_included', e.currentTarget.checked)}
                />
            </Group>
            <TextInput
                label="Rest Between Sets"
                onChange={(e) => form.setFieldValue('workout_metadata.rest_between_sets', e.currentTarget.value)}
                placeholder="e.g. 60-90 seconds"
                value={form.values.workout_metadata?.rest_between_sets || ''}
            />
            <MultiSelect
                data={form.values.workout_metadata?.form_cues || []}
                label="Form Cues"
                onChange={(val) => form.setFieldValue('workout_metadata.form_cues', val)}
                placeholder="Add cues"
                searchable
                value={form.values.workout_metadata?.form_cues || []}
            />
            <Textarea
                autosize
                label="Coach Notes"
                minRows={2}
                onChange={(e) => form.setFieldValue('workout_metadata.notes', e.currentTarget.value)}
                placeholder="General session notes"
                value={form.values.workout_metadata?.notes || ''}
            />
        </Stack>
    );

    const mealSection = sessionType === 'meal' && (
        <Stack gap={'sm'}>
            <Divider
                label="Meal Details"
                labelPosition="left"
            />
            <TextInput
                label="Serving Size"
                onChange={(e) => form.setFieldValue('meal_metadata.serving_size', e.currentTarget.value)}
                placeholder="e.g. 1 bowl"
                value={form.values.meal_metadata?.serving_size || ''}
            />
            <Switch
                checked={form.values.meal_metadata?.meal_prep_friendly || false}
                label="Meal Prep Friendly"
                onChange={(e) => form.setFieldValue('meal_metadata.meal_prep_friendly', e.currentTarget.checked)}
            />
            <MultiSelect
                data={form.values.meal_metadata?.equipment_needed || []}
                label="Equipment Needed"
                onChange={(val) => form.setFieldValue('meal_metadata.equipment_needed', val)}
                placeholder="Add equipment"
                searchable
                value={form.values.meal_metadata?.equipment_needed || []}
            />
            <MultiSelect
                data={form.values.meal_metadata?.storage_instructions || []}
                label="Storage Instructions"
                onChange={(val) => form.setFieldValue('meal_metadata.storage_instructions', val)}
                placeholder="Add instructions"
                searchable
                value={form.values.meal_metadata?.storage_instructions || []}
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
                        isSubmitting={form.submitting}
                        label={`Create ${typeConfig?.label}`}
                    />
                </Stack>
            </form>
        </PaddingContainer>
    );
}
