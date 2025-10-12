import {Divider, MultiSelect, Stack, Textarea, TextInput} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../contentForm';

interface ExerciseFormProps {
    form: UseFormReturn<ContentFormValues>;
}

const MUSCLE_OPTIONS = [
    {label: 'Chest', value: 'chest'},
    {label: 'Back', value: 'back'},
    {label: 'Shoulders', value: 'shoulders'},
    {label: 'Biceps', value: 'biceps'},
    {label: 'Triceps', value: 'triceps'},
    {label: 'Forearms', value: 'forearms'},
    {label: 'Abs', value: 'abs'},
    {label: 'Quads', value: 'quads'},
    {label: 'Hamstrings', value: 'hamstrings'},
    {label: 'Glutes', value: 'glutes'},
    {label: 'Calves', value: 'calves'},
];

const EQUIPMENT_OPTIONS = [
    {label: 'Barbell', value: 'barbell'},
    {label: 'Dumbbell', value: 'dumbbell'},
    {label: 'Kettlebell', value: 'kettlebell'},
    {label: 'Resistance Band', value: 'resistance_band'},
    {label: 'Cable Machine', value: 'cable_machine'},
    {label: 'Bodyweight', value: 'bodyweight'},
    {label: 'Machine', value: 'machine'},
];

/**
 * ExerciseForm - Exercise content form
 *
 * Follows WorkoutForm/MealForm pattern:
 * - Uses Controller from react-hook-form
 * - Clean, minimal layout with Stack
 * - Type-specific fields for exercise metadata
 */
export default function ExerciseForm({form}: ExerciseFormProps) {
    const {control} = form;

    return (
        <Stack gap="md">
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

            {/* Content Name */}
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
                    />
                )}
            />

            {/* Description */}
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
                        placeholder="Brief description of this exercise..."
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label="Details (Optional)"
                labelPosition="left"
                mb="sm"
                mt="md"
            />

            {/* Muscle Groups */}
            <Controller
                control={control}
                name="exercise_definition.muscle_groups"
                render={({field}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={MUSCLE_OPTIONS}
                        description="Primary muscles targeted"
                        label="Muscle Groups"
                        placeholder="Select muscles"
                        searchable
                        size="md"
                        value={field.value ?? []}
                    />
                )}
            />

            {/* Equipment */}
            <Controller
                control={control}
                name="exercise_definition.equipment"
                render={({field}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={EQUIPMENT_OPTIONS}
                        description="Required equipment"
                        label="Equipment"
                        placeholder="Select equipment"
                        searchable
                        size="md"
                        value={field.value ?? []}
                    />
                )}
            />

            {/* Difficulty Level */}
            <Controller
                control={control}
                name="exercise_definition.difficulty_level"
                render={({field}) => (
                    <TextInput
                        {...field}
                        description="Beginner, Intermediate, or Advanced"
                        label="Difficulty"
                        placeholder="e.g., Intermediate"
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />
        </Stack>
    );
}
