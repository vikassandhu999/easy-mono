import {MultiSelect, NumberInput, SegmentedControl, Stack, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle} from '@tabler/icons-react';
import {useState} from 'react';
import {Controller} from 'react-hook-form';

import {ChipSelect} from '@/components/ChipSelect';

import {InstructionsList, RadioCardGroup} from '../../components';
import {
    CATEGORY_OPTIONS,
    EQUIPMENT_OPTIONS,
    ExerciseFormProps,
    FORCE_OPTIONS,
    FORM_SECTIONS,
    LEVEL_OPTIONS,
    MECHANICS_OPTIONS,
    MOVEMENT_PATTERN_OPTIONS,
    PRIMARY_MUSCLE_OPTIONS,
} from '../../lib';

/**
 * ExerciseForm - Exercise-specific content form
 *
 * Architecture:
 * - Uses shared RadioCardGroup for consistent UI
 * - Uses shared InstructionsList for step management
 * - All constants extracted to constants.ts
 * - Clean, focused component with minimal logic
 */
export default function ExerciseForm({form}: ExerciseFormProps) {
    const {control, watch} = form;
    const [selectedTab, setSelectedTab] = useState<string>(FORM_SECTIONS[0].value);

    // Watch primary muscles to filter them out from secondary
    const primaryMuscles = watch('exercise_definition.primary_muscle') ?? [];

    return (
        <Stack gap="lg">
            {/* Hidden type field */}
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

            {/* Exercise name */}
            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        description="Name should be specific and descriptive"
                        error={fieldState.error?.message}
                        label="Exercise name"
                        placeholder="e.g., Barbell Back Squat"
                        withAsterisk
                    />
                )}
            />

            {/* Level */}
            <Controller
                control={control}
                name="exercise_definition.level"
                render={({field}) => (
                    <RadioCardGroup
                        label="Level"
                        onChange={field.onChange}
                        options={LEVEL_OPTIONS}
                        value={field.value}
                    />
                )}
            />

            {/* Category */}
            <Controller
                control={control}
                name="exercise_definition.category"
                render={({field}) => (
                    <RadioCardGroup
                        label="Category"
                        onChange={field.onChange}
                        options={CATEGORY_OPTIONS}
                        value={field.value}
                    />
                )}
            />

            {/* Primary muscles */}
            <Controller
                control={control}
                name="exercise_definition.primary_muscle"
                render={({field}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={PRIMARY_MUSCLE_OPTIONS}
                        description="Select up to 3 primary muscles targeted by this exercise"
                        label="Primary muscles"
                        onChange={(value) => {
                            if (value.length > 3) {
                                notifications.show({
                                    autoClose: 3000,
                                    color: 'orange',
                                    icon: <IconAlertCircle size={20} />,
                                    message: 'Select up to 3 primary muscles only',
                                    title: 'Maximum limit reached',
                                });
                                return;
                            }
                            field.onChange(value);
                        }}
                        placeholder="Select primary muscles"
                        value={field.value ?? []}
                    />
                )}
            />

            {/* Secondary muscles */}
            <Controller
                control={control}
                name="exercise_definition.secondary_muscle"
                render={({field}) => {
                    // Filter out muscles already selected as primary
                    const availableSecondaryMuscles = PRIMARY_MUSCLE_OPTIONS.filter(
                        (option) => !primaryMuscles.includes(option.value),
                    );

                    return (
                        <MultiSelect
                            {...field}
                            clearable
                            data={availableSecondaryMuscles}
                            description="Select up to 3 secondary muscles (cannot overlap with primary)"
                            label="Secondary muscles"
                            maxValues={3}
                            onChange={(value) => {
                                if (value.length > 3) {
                                    notifications.show({
                                        autoClose: 3000,
                                        color: 'orange',
                                        icon: <IconAlertCircle size={20} />,
                                        message: 'Select up to 3 secondary muscles only',
                                        title: 'Maximum limit reached',
                                    });
                                    return;
                                }
                                field.onChange(value);
                            }}
                            placeholder="Select secondary muscles"
                            value={field.value ?? []}
                        />
                    );
                }}
            />

            {/* Force */}
            <Controller
                control={control}
                name="exercise_definition.force"
                render={({field}) => (
                    <RadioCardGroup
                        label="Force"
                        onChange={field.onChange}
                        options={FORCE_OPTIONS}
                        value={field.value}
                    />
                )}
            />

            {/* Media URL */}
            <Controller
                control={control}
                name="media"
                render={({field}) => (
                    <TextInput
                        {...field}
                        description="Image or video URL for this exercise"
                        label="Media URL (optional)"
                        onChange={(e) => {
                            const url = e.currentTarget.value;
                            field.onChange(url ? {url, type: 'image'} : undefined);
                        }}
                        placeholder="https://example.com/exercise.jpg"
                        type="url"
                        value={field.value?.url ?? ''}
                    />
                )}
            />

            {/* Tab selector */}
            <SegmentedControl
                data={[...FORM_SECTIONS]}
                fullWidth
                onChange={setSelectedTab}
                radius="md"
                size="md"
                value={selectedTab}
            />

            {/* Instructions tab */}
            {selectedTab === 'instructions' && (
                <Controller
                    control={control}
                    name="exercise_definition.instructions"
                    render={({field}) => {
                        const instructions = Array.isArray(field.value) ? field.value : [];

                        return (
                            <InstructionsList
                                description="Describe each step to perform the exercise correctly"
                                instructions={instructions}
                                onChange={field.onChange}
                                placeholder="Describe what to do"
                            />
                        );
                    }}
                />
            )}

            {/* Advanced tab */}
            {selectedTab === 'advanced' && (
                <>
                    <Controller
                        control={control}
                        name="exercise_definition.calories_per_minute"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={2}
                                description="Estimated calories burned per minute"
                                label="Calories per minute (optional)"
                                min={0}
                                placeholder="e.g., 5.5"
                                step={0.1}
                                value={field.value ?? undefined}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.equipment"
                        render={({field}) => (
                            <ChipSelect
                                {...field}
                                data={EQUIPMENT_OPTIONS}
                                label="Equipment"
                                multiple
                                value={field.value ?? []}
                                variant="outline"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.mechanics"
                        render={({field}) => (
                            <RadioCardGroup
                                label="Mechanics"
                                onChange={field.onChange}
                                options={MECHANICS_OPTIONS}
                                value={field.value}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.movement_pattern"
                        render={({field}) => (
                            <RadioCardGroup
                                label="Movement pattern"
                                onChange={field.onChange}
                                options={MOVEMENT_PATTERN_OPTIONS}
                                value={field.value}
                            />
                        )}
                    />
                </>
            )}
        </Stack>
    );
}
