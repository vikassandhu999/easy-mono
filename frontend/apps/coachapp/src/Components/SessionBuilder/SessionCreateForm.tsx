import {CreateSessionDef, SessionType} from '@/Api/SessionDefs';
import {Stack, TextInput, NumberInput, Switch, Textarea, MultiSelect, Group, Divider} from '@mantine/core';
import {useForm} from '@mantine/form';
import {FixedBottom} from '../Containers/FixedBottom';
import {SESSION_TYPE_CONFIG} from '../ScheduleBuilder/sessionTypeConfig';
import PaddingContainer from '../Containers/PaddingContainer';

interface SessionCreateFormProps {
    sessionType: SessionType;
    onSubmit: (values: CreateSessionDef) => Promise<void>;
}

export default function SessionCreateForm({sessionType, onSubmit}: SessionCreateFormProps) {
    const typeConfig = SESSION_TYPE_CONFIG[sessionType] || SESSION_TYPE_CONFIG.other;

    const form = useForm<CreateSessionDef & {workout_metadata?: any; meal_metadata?: any}>({
        initialValues: {
            name: '',
            description: '',
            session_type: sessionType,
            duration_minutes: 30,
            workout_metadata: sessionType === 'workout' ? {warmup_included: true, cooldown_included: true} : undefined,
            meal_metadata: sessionType === 'meal' ? {meal_prep_friendly: false} : undefined,
        },
        validate: {
            name: (value) => (!value || value.trim().length === 0 ? 'Name is required' : null),
            duration_minutes: (value) => {
                if (!value || value < 1) return 'Duration must be at least 1 minute';
                if (value > 480) return 'Duration cannot exceed 480 minutes (8 hours)';
                return null;
            },
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
    });

    const workoutSection = sessionType === 'workout' && (
        <Stack gap={'sm'}>
            <Divider
                label="Workout Details"
                labelPosition="left"
            />
            <Group grow>
                <Switch
                    label="Include Warm-up"
                    checked={form.values.workout_metadata?.warmup_included || false}
                    onChange={(e) => form.setFieldValue('workout_metadata.warmup_included', e.currentTarget.checked)}
                />
                <Switch
                    label="Include Cool-down"
                    checked={form.values.workout_metadata?.cooldown_included || false}
                    onChange={(e) => form.setFieldValue('workout_metadata.cooldown_included', e.currentTarget.checked)}
                />
            </Group>
            <TextInput
                label="Rest Between Sets"
                placeholder="e.g. 60-90 seconds"
                value={form.values.workout_metadata?.rest_between_sets || ''}
                onChange={(e) => form.setFieldValue('workout_metadata.rest_between_sets', e.currentTarget.value)}
            />
            <MultiSelect
                label="Form Cues"
                placeholder="Add cues"
                searchable
                data={form.values.workout_metadata?.form_cues || []}
                value={form.values.workout_metadata?.form_cues || []}
                onChange={(val) => form.setFieldValue('workout_metadata.form_cues', val)}
            />
            <Textarea
                label="Coach Notes"
                placeholder="General session notes"
                value={form.values.workout_metadata?.notes || ''}
                onChange={(e) => form.setFieldValue('workout_metadata.notes', e.currentTarget.value)}
                autosize
                minRows={2}
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
                placeholder="e.g. 1 bowl"
                value={form.values.meal_metadata?.serving_size || ''}
                onChange={(e) => form.setFieldValue('meal_metadata.serving_size', e.currentTarget.value)}
            />
            <Switch
                label="Meal Prep Friendly"
                checked={form.values.meal_metadata?.meal_prep_friendly || false}
                onChange={(e) => form.setFieldValue('meal_metadata.meal_prep_friendly', e.currentTarget.checked)}
            />
            <MultiSelect
                label="Equipment Needed"
                placeholder="Add equipment"
                searchable
                data={form.values.meal_metadata?.equipment_needed || []}
                value={form.values.meal_metadata?.equipment_needed || []}
                onChange={(val) => form.setFieldValue('meal_metadata.equipment_needed', val)}
            />
            <MultiSelect
                label="Storage Instructions"
                placeholder="Add instructions"
                searchable
                data={form.values.meal_metadata?.storage_instructions || []}
                value={form.values.meal_metadata?.storage_instructions || []}
                onChange={(val) => form.setFieldValue('meal_metadata.storage_instructions', val)}
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
                        placeholder={`Enter ${typeConfig.label.toLowerCase()} name`}
                        required
                        size={'md'}
                        {...form.getInputProps('name')}
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />

                    {/* Duration */}
                    <NumberInput
                        label="Duration (minutes)"
                        placeholder="30"
                        min={1}
                        max={480}
                        size={'md'}
                        {...form.getInputProps('duration_minutes')}
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />

                    {workoutSection}
                    {mealSection}

                    <FixedBottom
                        isSubmitting={form.submitting}
                        label={`Create ${typeConfig.label}`}
                    />
                </Stack>
            </form>
        </PaddingContainer>
    );
}
