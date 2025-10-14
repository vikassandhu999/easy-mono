import {
    ActionIcon,
    Button,
    Group,
    Indicator,
    MultiSelect,
    NumberInput,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {
    IconArrowBigDownLines,
    IconArrowBigUpLines,
    IconBarbell,
    IconFlame,
    IconHandStop,
    IconJumpRope,
    IconOlympics,
    IconPlus,
    IconRun,
    IconStretching,
    IconTarget,
    IconTrash,
    IconTrophy,
} from '@tabler/icons-react';
import {useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ChipSelect} from '@/components/ChipSelect';

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
    {label: 'Strength', value: 'strength', icon: IconBarbell},
    {label: 'Cardio', value: 'cardio', icon: IconRun},
    {label: 'Plyometric', value: 'plyometric', icon: IconJumpRope},
    {label: 'Stretching', value: 'stretching', icon: IconStretching},
    {label: 'Olympic Weightlifting', value: 'olympic', icon: IconOlympics},
    {label: 'Powerlifting', value: 'powerlifting', icon: IconTrophy},
    {label: 'Strongman', value: 'strongman', icon: IconFlame},
];

const LEVEL_OPTIONS = [
    {label: 'Beginner', value: 'beginner'},
    {label: 'Intermediate', value: 'intermediate'},
    {label: 'Expert', value: 'expert'},
];

const FORCE_OPTIONS = [
    {label: 'Push', value: 'push', icon: IconArrowBigUpLines},
    {label: 'Pull', value: 'pull', icon: IconArrowBigDownLines},
    {label: 'Static', value: 'static', icon: IconHandStop},
];

const MECHANICS_OPTIONS = [
    {label: 'Compound', value: 'compound', icon: IconBarbell},
    {label: 'Isolation', value: 'isolation', icon: IconTarget},
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

const FORM_SECTIONS = [
    {
        label: 'Instructions',
        value: 'instructions',
    },
    {
        label: 'Advanced',
        value: 'advanced',
    },
];

export default function ExerciseForm({form}: ExerciseFormProps) {
    const {control} = form;
    const [selectedTab, setSelectedTab] = useState(() => FORM_SECTIONS[0].value);

    return (
        <Stack gap="sm">
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

            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        placeholder="Name of exercise. e.g. Barbell Back Squat"
                        radius="lg"
                        required
                        size="xl"
                        variant="filled"
                    />
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.level"
                render={({field}) => (
                    <ChipSelect
                        {...field}
                        data={LEVEL_OPTIONS}
                        label={
                            <Text
                                fw={600}
                                size="sm"
                            >
                                Level
                            </Text>
                        }
                        radius="lg"
                        size="sm"
                        value={field.value ?? LEVEL_OPTIONS[0]}
                        variant="outline"
                    />
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.category"
                render={({field}) => (
                    <ChipSelect
                        {...field}
                        data={CATEGORY_OPTIONS}
                        label={
                            <Text
                                fw={600}
                                size="sm"
                            >
                                Category
                            </Text>
                        }
                        radius="lg"
                        size="sm"
                        value={field.value ?? ''}
                        variant="outline"
                    />
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.primary_muscle"
                render={({field}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={PRIMARY_MUSCLE_OPTIONS}
                        label="Primary Muscles"
                        maxValues={3}
                        placeholder="Select primary muscles"
                        radius="lg"
                        searchable
                        size="sm"
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
                        label="Secondary Muscles"
                        placeholder="Select secondary muscles"
                        radius="lg"
                        searchable
                        size="sm"
                        value={field.value ?? []}
                    />
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.force"
                render={({field}) => (
                    <ChipSelect
                        {...field}
                        data={FORCE_OPTIONS}
                        label={
                            <Text
                                fw={600}
                                size="sm"
                            >
                                Force
                            </Text>
                        }
                        radius="lg"
                        size="sm"
                        value={field.value ?? ''}
                        variant="outline"
                    />
                )}
            />

            <Controller
                control={control}
                name="media"
                render={({field}) => (
                    <TextInput
                        {...field}
                        description="Image or video URL for this exercise"
                        label="Media URL"
                        onChange={(e) => {
                            const url = e.currentTarget.value;
                            field.onChange(url ? {url, type: 'image'} : undefined);
                        }}
                        placeholder="https://example.com/exercise.jpg"
                        radius="lg"
                        size="sm"
                        type="url"
                        value={field.value?.url ?? ''}
                    />
                )}
            />

            <SegmentedControl
                data={FORM_SECTIONS}
                onChange={setSelectedTab}
                radius="lg"
                size="lg"
                value={selectedTab}
            ></SegmentedControl>

            {selectedTab === 'instructions' && (
                <Controller
                    control={control}
                    name="exercise_definition.instructions"
                    render={({field}) => {
                        const instructions = Array.isArray(field.value) ? field.value : [];

                        const handleAddInstruction = () => {
                            field.onChange([...instructions, '']);
                        };

                        const handleRemoveInstruction = (index: number) => {
                            const newInstructions = instructions.filter((_, i) => i !== index);
                            field.onChange(newInstructions.length > 0 ? newInstructions : []);
                        };

                        const handleUpdateInstruction = (index: number, value: string) => {
                            const newInstructions = [...instructions];
                            newInstructions[index] = value;
                            field.onChange(newInstructions);
                        };

                        return (
                            <Stack gap="md">
                                <Text
                                    fs="italic"
                                    size="xs"
                                >
                                    You can describe step to perform
                                </Text>

                                {instructions.map((instruction, index) => (
                                    <Group
                                        align="center"
                                        gap="xs"
                                        key={index}
                                        wrap="nowrap"
                                    >
                                        <Indicator
                                            label={index + 1}
                                            position="top-start"
                                            size={18}
                                            w="100%"
                                        >
                                            <TextInput
                                                flex={1}
                                                onChange={(e) => handleUpdateInstruction(index, e.currentTarget.value)}
                                                placeholder={`Describe what to do`}
                                                radius="lg"
                                                size="md"
                                                value={instruction}
                                            />
                                        </Indicator>

                                        <ActionIcon
                                            color="red"
                                            onClick={() => handleRemoveInstruction(index)}
                                            radius="lg"
                                            size="md"
                                            variant="light"
                                        >
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                ))}

                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    onClick={handleAddInstruction}
                                    radius="lg"
                                    size="compact-sm"
                                    variant="light"
                                    w="max-content"
                                >
                                    Add Step
                                </Button>
                            </Stack>
                        );
                    }}
                />
            )}

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
                                label="Calories Per Minute"
                                min={0}
                                placeholder="e.g., 5.5"
                                radius="lg"
                                size="sm"
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
                                label={
                                    <Text
                                        fw={600}
                                        size="sm"
                                    >
                                        Equipment
                                    </Text>
                                }
                                multiple
                                radius="lg"
                                size="sm"
                                value={field.value ?? []}
                                variant="outline"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.mechanics"
                        render={({field}) => (
                            <ChipSelect
                                {...field}
                                data={MECHANICS_OPTIONS}
                                label={
                                    <Text
                                        fw={600}
                                        size="sm"
                                    >
                                        Mechanics
                                    </Text>
                                }
                                radius="lg"
                                size="sm"
                                value={field.value ?? ''}
                                variant="outline"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.movement_pattern"
                        render={({field}) => (
                            <ChipSelect
                                {...field}
                                data={MOVEMENT_PATTERN_OPTIONS}
                                label={
                                    <Text
                                        fw={600}
                                        size="sm"
                                    >
                                        Movement Pattern
                                    </Text>
                                }
                                radius="lg"
                                size="sm"
                                value={field.value ?? ''}
                                variant="outline"
                            />
                        )}
                    />
                </>
            )}
        </Stack>
    );
}
