import {Divider, Group, MultiSelect, Select, Stack, Textarea, TextInput, Title} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../contentForm';

interface ExerciseFormProps {
    form: UseFormReturn<ContentFormValues>;
}

// Comprehensive muscle options aligned with backend
const PRIMARY_MUSCLE_OPTIONS = [
    {label: 'Chest', value: 'chest'},
    {label: 'Back', value: 'back'},
    {label: 'Shoulders', value: 'shoulders'},
    {label: 'Biceps', value: 'biceps'},
    {label: 'Triceps', value: 'triceps'},
    {label: 'Forearms', value: 'forearms'},
    {label: 'Abs', value: 'abs'},
    {label: 'Obliques', value: 'obliques'},
    {label: 'Quads', value: 'quads'},
    {label: 'Hamstrings', value: 'hamstrings'},
    {label: 'Glutes', value: 'glutes'},
    {label: 'Calves', value: 'calves'},
    {label: 'Lower Back', value: 'lower_back'},
    {label: 'Traps', value: 'traps'},
];

const EQUIPMENT_OPTIONS = [
    {label: 'Barbell', value: 'barbell'},
    {label: 'Dumbbell', value: 'dumbbell'},
    {label: 'Kettlebell', value: 'kettlebell'},
    {label: 'Resistance Band', value: 'resistance_band'},
    {label: 'Cable Machine', value: 'cable_machine'},
    {label: 'Bodyweight', value: 'bodyweight'},
    {label: 'Machine', value: 'machine'},
    {label: 'Smith Machine', value: 'smith_machine'},
    {label: 'TRX/Suspension', value: 'suspension'},
    {label: 'Medicine Ball', value: 'medicine_ball'},
    {label: 'Plate', value: 'plate'},
];

const CATEGORY_OPTIONS = [
    {label: 'Strength', value: 'strength'},
    {label: 'Cardio', value: 'cardio'},
    {label: 'Plyometric', value: 'plyometric'},
    {label: 'Stretching', value: 'stretching'},
    {label: 'Olympic Weightlifting', value: 'olympic'},
    {label: 'Powerlifting', value: 'powerlifting'},
    {label: 'Strongman', value: 'strongman'},
];

const LEVEL_OPTIONS = [
    {label: 'Beginner', value: 'beginner'},
    {label: 'Intermediate', value: 'intermediate'},
    {label: 'Advanced', value: 'advanced'},
    {label: 'Expert', value: 'expert'},
];

const FORCE_OPTIONS = [
    {label: 'Push', value: 'push'},
    {label: 'Pull', value: 'pull'},
    {label: 'Static', value: 'static'},
];

const MECHANICS_OPTIONS = [
    {label: 'Compound', value: 'compound'},
    {label: 'Isolation', value: 'isolation'},
];

const MOVEMENT_PATTERN_OPTIONS = [
    {label: 'Squat', value: 'squat'},
    {label: 'Hinge', value: 'hinge'},
    {label: 'Lunge', value: 'lunge'},
    {label: 'Push', value: 'push'},
    {label: 'Pull', value: 'pull'},
    {label: 'Carry', value: 'carry'},
    {label: 'Rotation', value: 'rotation'},
];

/**
 * ExerciseForm - Comprehensive exercise content form
 *
 * Visual Hierarchy:
 * 1. Essential fields (Name, Description) - Most important
 * 2. Classification (Category, Level, Muscles) - Core metadata
 * 3. Movement details (Equipment, Force, Mechanics) - Programming info
 * 4. Instructions - Teaching content
 */
export default function ExerciseForm({form}: ExerciseFormProps) {
    const {control} = form;

    return (
        <Stack gap="lg">
            {/* Hidden content type field */}
            <Controller
                control={control}
                name="type"
                render={({field}) => (
                    <input
                        {...field}
                        type="hidden"
                        value={field.value}
                    />
                )}
            />

            {/* SECTION 1: Essential Info */}
            <Stack gap="md">
                <Controller
                    control={control}
                    name="name"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            error={fieldState.error?.message}
                            label="Name"
                            placeholder="e.g., Barbell Back Squat"
                            required
                            size="md"
                            styles={{
                                label: {
                                    fontSize: '16px',
                                    fontWeight: 600,
                                },
                            }}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="description"
                    render={({field, fieldState}) => (
                        <Textarea
                            {...field}
                            autosize
                            error={fieldState.error?.message}
                            label="Description"
                            maxRows={6}
                            minRows={3}
                            placeholder="A compound lower body exercise that targets the quadriceps, glutes, and core..."
                            size="md"
                            value={field.value ?? ''}
                        />
                    )}
                />
            </Stack>

            <Divider />

            {/* SECTION 2: Classification */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Classification
                </Title>

                <Group grow>
                    <Controller
                        control={control}
                        name="exercise_definition.category"
                        render={({field}) => (
                            <Select
                                {...field}
                                clearable
                                data={CATEGORY_OPTIONS}
                                label="Category"
                                placeholder="Select category"
                                searchable
                                size="md"
                                value={field.value ?? null}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.level"
                        render={({field}) => (
                            <Select
                                {...field}
                                clearable
                                data={LEVEL_OPTIONS}
                                label="Level"
                                placeholder="Select level"
                                size="md"
                                value={field.value ?? null}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={control}
                    name="exercise_definition.primary_muscle"
                    render={({field}) => (
                        <MultiSelect
                            {...field}
                            clearable
                            data={PRIMARY_MUSCLE_OPTIONS}
                            description="Primary muscles targeted"
                            label="Primary Muscles"
                            placeholder="Select primary muscles"
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="exercise_definition.secondary_muscle"
                    render={({field}) => (
                        <MultiSelect
                            {...field}
                            clearable
                            data={PRIMARY_MUSCLE_OPTIONS}
                            description="Supporting muscles"
                            label="Secondary Muscles"
                            placeholder="Select secondary muscles"
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />
            </Stack>

            <Divider />

            {/* SECTION 3: Movement Details */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Movement Details
                </Title>

                <Controller
                    control={control}
                    name="exercise_definition.equipment"
                    render={({field}) => (
                        <MultiSelect
                            {...field}
                            clearable
                            data={EQUIPMENT_OPTIONS}
                            description="Equipment needed"
                            label="Equipment"
                            placeholder="Select equipment"
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />

                <Group grow>
                    <Controller
                        control={control}
                        name="exercise_definition.force"
                        render={({field}) => (
                            <Select
                                {...field}
                                clearable
                                data={FORCE_OPTIONS}
                                label="Force"
                                placeholder="Select force"
                                size="md"
                                value={field.value ?? null}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.mechanics"
                        render={({field}) => (
                            <Select
                                {...field}
                                clearable
                                data={MECHANICS_OPTIONS}
                                description="Joint movement"
                                label="Mechanics"
                                placeholder="Select type"
                                size="md"
                                value={field.value ?? null}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={control}
                    name="exercise_definition.movement_pattern"
                    render={({field}) => (
                        <Select
                            {...field}
                            clearable
                            data={MOVEMENT_PATTERN_OPTIONS}
                            label="Movement Pattern"
                            placeholder="Select pattern"
                            searchable
                            size="md"
                            value={field.value ?? null}
                        />
                    )}
                />
            </Stack>

            <Divider />

            {/* SECTION 4: Instructions */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Instructions (Optional)
                </Title>

                <Controller
                    control={control}
                    name="exercise_definition.instructions"
                    render={({field}) => (
                        <Textarea
                            autosize
                            description="One step per line"
                            label="How to Perform"
                            maxRows={10}
                            minRows={4}
                            onChange={(e) => {
                                const lines = e.currentTarget.value.split('\n').filter((line) => line.trim());
                                field.onChange(lines.length > 0 ? lines : []);
                            }}
                            placeholder={
                                '1. Stand with feet shoulder-width apart\n2. Brace your core and maintain upright torso\n3. Lower down by bending knees and hips\n4. Drive through heels to return to start'
                            }
                            size="md"
                            value={Array.isArray(field.value) ? field.value.join('\n') : (field.value ?? '')}
                        />
                    )}
                />
            </Stack>
        </Stack>
    );
}
