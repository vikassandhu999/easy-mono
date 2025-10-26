import {Chip, ComboboxData, Group, InputWrapper, MultiSelect, NumberInput, Select, Textarea} from '@mantine/core';
import {UseFormReturn} from 'react-hook-form';

import EasyController from '@/shared/EasyController';

import {FormValues} from '../types.ts';

function toTitleCase(str: string) {
    return str.replace('_', ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
// Option data for dropdowns - these should ideally come from backend defaults
const MUSCLE_GROUPS = [
    'chest',
    'back',
    'shoulders',
    'arms',
    'biceps',
    'triceps',
    'forearms',
    'core',
    'abs',
    'obliques',
    'glutes',
    'quads',
    'hamstrings',
    'calves',
    'full_body',
    'upper_body',
    'lower_body',
];

const MUSCLE_GROUPS_ComboboxData: ComboboxData = MUSCLE_GROUPS.map((group) => ({
    label: toTitleCase(group),
    value: group,
}));

const EQUIPMENT_OPTIONS = [
    'bodyweight',
    'dumbbells',
    'barbell',
    'kettlebell',
    'resistance_bands',
    'pull_up_bar',
    'cable_machine',
    'smith_machine',
    'leg_press',
    'lat_pulldown',
    'rowing_machine',
    'treadmill',
    'stationary_bike',
    'medicine_ball',
    'stability_ball',
    'foam_roller',
    'trx',
    'battle_ropes',
    'jump_rope',
    'none',
];

const EQUIPMENT_OPTIONS_ComboboxData: ComboboxData = EQUIPMENT_OPTIONS.map((eq) => ({
    label: toTitleCase(eq.replace(/_/g, ' ')),
    value: eq,
}));

const DIFFICULTY_LEVELS = [
    {label: 'Beginner', value: 'beginner'},
    {label: 'Intermediate', value: 'intermediate'},
    {label: 'Advanced', value: 'advanced'},
    {label: 'Expert', value: 'expert'},
];

const MOVEMENT_PATTERNS = [
    {label: 'Push', value: 'push'},
    {label: 'Pull', value: 'pull'},
    {label: 'Squat', value: 'squat'},
    {label: 'Hinge', value: 'hinge'},
    {label: 'Lunge', value: 'lunge'},
    {label: 'Carry', value: 'carry'},
    {label: 'Rotation', value: 'rotation'},
    {label: 'Gait', value: 'gait'},
    {label: 'Isolation', value: 'isolation'},
];

const MECHANICS_OPTIONS = [
    {label: 'Compound', value: 'compound'},
    {label: 'Isolation', value: 'isolation'},
];

const REP_RANGES = [
    '1-3 (Power)',
    '4-6 (Strength)',
    '7-12 (Hypertrophy)',
    '13-20 (Endurance)',
    '20+ (Ultra Endurance)',
];

const RANGE_OF_MOTION = [
    {label: 'Full ROM', value: 'full'},
    {label: 'Partial ROM', value: 'partial'},
    {label: 'Stretched Position', value: 'stretched'},
    {label: 'Contracted Position', value: 'contracted'},
];

export function ExerciseMetadataForm({form}: {form: UseFormReturn<FormValues>}) {
    return (
        <>
            {/* Movement Classification */}
            <EasyController
                control={form.control}
                name="exercise_definition.muscle_groups"
                render={({field}) => (
                    <MultiSelect
                        clearable
                        data={MUSCLE_GROUPS_ComboboxData}
                        label="Muscle Groups"
                        placeholder="Select primary muscle groups"
                        searchable
                        {...field}
                    />
                )}
            />
            <EasyController
                control={form.control}
                name="exercise_definition.equipment"
                render={({field}) => (
                    <MultiSelect
                        clearable
                        data={EQUIPMENT_OPTIONS_ComboboxData}
                        label="Equipment"
                        placeholder="Select required equipment"
                        searchable
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.difficulty"
                render={({field}) => (
                    <Select
                        clearable
                        data={DIFFICULTY_LEVELS}
                        label="Difficulty"
                        placeholder="Select difficulty level"
                        searchable
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.movement_pattern"
                render={({field}) => (
                    <Select
                        clearable
                        data={MOVEMENT_PATTERNS}
                        label="Movement Pattern"
                        placeholder="Select movement pattern"
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.mechanics"
                render={({field}) => (
                    <Select
                        clearable
                        data={MECHANICS_OPTIONS}
                        label="Mechanics"
                        placeholder="Compound or Isolation"
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.default_sets"
                render={({field, fieldState}) => (
                    <NumberInput
                        error={fieldState.error?.message}
                        label="Default Sets"
                        placeholder="3"
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.calories_burned_per_minute"
                render={({field, fieldState}) => (
                    <NumberInput
                        decimalScale={1}
                        error={fieldState.error?.message}
                        label="Calories/Minute"
                        min={0}
                        placeholder="5"
                        step={0.1}
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.range_of_motion"
                render={({field}) => (
                    <Select
                        clearable
                        data={RANGE_OF_MOTION}
                        label="Range of Motion"
                        placeholder="Select ROM preference"
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.rest_recommendation"
                render={({field}) => (
                    <Textarea
                        autosize
                        label="Rest Recommendation"
                        maxRows={2}
                        minRows={1}
                        placeholder="e.g., 2-3 minutes between sets"
                        {...field}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.tempo"
                render={({field}) => (
                    <Textarea
                        autosize
                        label="Tempo"
                        maxRows={2}
                        minRows={1}
                        placeholder="e.g., 2-1-2-1 (eccentric-pause-concentric-pause)"
                        {...field}
                    />
                )}
            />

            {/* Rep Ranges */}
            <EasyController
                control={form.control}
                name="exercise_definition.common_rep_ranges"
                render={({field, fieldState}) => (
                    <InputWrapper
                        error={fieldState.error?.message}
                        label="Common Rep Ranges"
                        mb={'sm'}
                        size={'md'}
                    >
                        <Chip.Group
                            multiple
                            onChange={field.onChange}
                            value={field.value || []}
                        >
                            <Group
                                gap="sm"
                                mt={'md'}
                                wrap={'wrap'}
                            >
                                {REP_RANGES.map((range) => (
                                    <Chip
                                        key={range}
                                        size="sm"
                                        value={range}
                                    >
                                        {range}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                    </InputWrapper>
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.form_cues"
                render={({field}) => (
                    <Textarea
                        autosize
                        label="Form Cues"
                        maxRows={6}
                        minRows={3}
                        placeholder="Key coaching points (one per line)"
                        {...field}
                        onChange={(event) => {
                            const lines = event.target.value.split('\n').filter((line) => line.trim());
                            field.onChange(lines);
                        }}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.common_mistakes"
                render={({field}) => (
                    <Textarea
                        autosize
                        label="Common Mistakes"
                        maxRows={4}
                        minRows={2}
                        placeholder="Things to watch out for (one per line)"
                        {...field}
                        onChange={(event) => {
                            const lines = event.target.value.split('\n').filter((line) => line.trim());
                            field.onChange(lines);
                        }}
                    />
                )}
            />

            <EasyController
                control={form.control}
                name="exercise_definition.contraindications"
                render={({field}) => (
                    <Textarea
                        autosize
                        label="Contraindications"
                        maxRows={4}
                        minRows={2}
                        placeholder="When to avoid this exercise (one per line)"
                        {...field}
                        onChange={(event) => {
                            const lines = event.target.value.split('\n').filter((line) => line.trim());
                            field.onChange(lines);
                        }}
                    />
                )}
            />
        </>
    );
}
