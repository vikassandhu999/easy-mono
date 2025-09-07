import {Group, NumberInput, Select, Textarea, MultiSelect, Chip, InputWrapper, ComboboxData} from '@mantine/core';
import {UseFormReturn} from 'react-hook-form';
import {FormValues} from '../types.ts';
import {InputController} from '@/components/InputController';

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
    value: group,
    label: toTitleCase(group),
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
    value: eq,
    label: toTitleCase(eq.replace(/_/g, ' ')),
}));

const DIFFICULTY_LEVELS = [
    {value: 'beginner', label: 'Beginner'},
    {value: 'intermediate', label: 'Intermediate'},
    {value: 'advanced', label: 'Advanced'},
    {value: 'expert', label: 'Expert'},
];

const MOVEMENT_PATTERNS = [
    {value: 'push', label: 'Push'},
    {value: 'pull', label: 'Pull'},
    {value: 'squat', label: 'Squat'},
    {value: 'hinge', label: 'Hinge'},
    {value: 'lunge', label: 'Lunge'},
    {value: 'carry', label: 'Carry'},
    {value: 'rotation', label: 'Rotation'},
    {value: 'gait', label: 'Gait'},
    {value: 'isolation', label: 'Isolation'},
];

const MECHANICS_OPTIONS = [
    {value: 'compound', label: 'Compound'},
    {value: 'isolation', label: 'Isolation'},
];

const REP_RANGES = [
    '1-3 (Power)',
    '4-6 (Strength)',
    '7-12 (Hypertrophy)',
    '13-20 (Endurance)',
    '20+ (Ultra Endurance)',
];

const RANGE_OF_MOTION = [
    {value: 'full', label: 'Full ROM'},
    {value: 'partial', label: 'Partial ROM'},
    {value: 'stretched', label: 'Stretched Position'},
    {value: 'contracted', label: 'Contracted Position'},
];

export function ExerciseMetadataForm({form}: {form: UseFormReturn<FormValues>}) {
    return (
        <>
            {/* Movement Classification */}
            <InputController
                name="exercise_metadata.muscle_groups"
                control={form.control}
                render={({field}) => (
                    <MultiSelect
                        label="Muscle Groups"
                        placeholder="Select primary muscle groups"
                        data={MUSCLE_GROUPS_ComboboxData}
                        searchable
                        clearable
                        {...field}
                    />
                )}
            />
            <InputController
                name="exercise_metadata.equipment"
                control={form.control}
                render={({field}) => (
                    <MultiSelect
                        label="Equipment"
                        placeholder="Select required equipment"
                        data={EQUIPMENT_OPTIONS_ComboboxData}
                        searchable
                        clearable
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.difficulty"
                control={form.control}
                render={({field}) => (
                    <Select
                        label="Difficulty"
                        placeholder="Select difficulty level"
                        data={DIFFICULTY_LEVELS}
                        searchable
                        clearable
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.movement_pattern"
                control={form.control}
                render={({field}) => (
                    <Select
                        label="Movement Pattern"
                        placeholder="Select movement pattern"
                        data={MOVEMENT_PATTERNS}
                        clearable
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.mechanics"
                control={form.control}
                render={({field}) => (
                    <Select
                        label="Mechanics"
                        placeholder="Compound or Isolation"
                        data={MECHANICS_OPTIONS}
                        clearable
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.default_sets"
                control={form.control}
                render={({field, fieldState}) => (
                    <NumberInput
                        label="Default Sets"
                        placeholder="3"
                        error={fieldState.error?.message}
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.calories_burned_per_minute"
                control={form.control}
                render={({field, fieldState}) => (
                    <NumberInput
                        label="Calories/Minute"
                        placeholder="5"
                        min={0}
                        step={0.1}
                        decimalScale={1}
                        error={fieldState.error?.message}
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.range_of_motion"
                control={form.control}
                render={({field}) => (
                    <Select
                        label="Range of Motion"
                        placeholder="Select ROM preference"
                        data={RANGE_OF_MOTION}
                        clearable
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.rest_recommendation"
                control={form.control}
                render={({field}) => (
                    <Textarea
                        label="Rest Recommendation"
                        placeholder="e.g., 2-3 minutes between sets"
                        autosize
                        minRows={1}
                        maxRows={2}
                        {...field}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.tempo"
                control={form.control}
                render={({field}) => (
                    <Textarea
                        label="Tempo"
                        placeholder="e.g., 2-1-2-1 (eccentric-pause-concentric-pause)"
                        autosize
                        minRows={1}
                        maxRows={2}
                        {...field}
                    />
                )}
            />

            {/* Rep Ranges */}
            <InputController
                name="exercise_metadata.common_rep_ranges"
                control={form.control}
                render={({field, fieldState}) => (
                    <InputWrapper
                        label="Common Rep Ranges"
                        size={'md'}
                        mb={'sm'}
                        error={fieldState.error?.message}
                    >
                        <Chip.Group
                            multiple
                            value={field.value || []}
                            onChange={field.onChange}
                        >
                            <Group
                                mt={'md'}
                                wrap={'wrap'}
                                gap="sm"
                            >
                                {REP_RANGES.map((range) => (
                                    <Chip
                                        key={range}
                                        value={range}
                                        size="sm"
                                    >
                                        {range}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                    </InputWrapper>
                )}
            />

            <InputController
                name="exercise_metadata.form_cues"
                control={form.control}
                render={({field}) => (
                    <Textarea
                        label="Form Cues"
                        placeholder="Key coaching points (one per line)"
                        autosize
                        minRows={3}
                        maxRows={6}
                        {...field}
                        onChange={(event) => {
                            const lines = event.target.value.split('\n').filter((line) => line.trim());
                            field.onChange(lines);
                        }}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.common_mistakes"
                control={form.control}
                render={({field}) => (
                    <Textarea
                        label="Common Mistakes"
                        placeholder="Things to watch out for (one per line)"
                        autosize
                        minRows={2}
                        maxRows={4}
                        {...field}
                        onChange={(event) => {
                            const lines = event.target.value.split('\n').filter((line) => line.trim());
                            field.onChange(lines);
                        }}
                    />
                )}
            />

            <InputController
                name="exercise_metadata.contraindications"
                control={form.control}
                render={({field}) => (
                    <Textarea
                        label="Contraindications"
                        placeholder="When to avoid this exercise (one per line)"
                        autosize
                        minRows={2}
                        maxRows={4}
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
