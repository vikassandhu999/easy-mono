import {
    ActionIcon,
    Button,
    Group,
    Indicator,
    MultiSelect,
    NumberInput,
    Radio,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {
    IconAlertCircle,
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
    {label: 'Beginner', value: 'beginner', icon: IconTarget},
    {label: 'Intermediate', value: 'intermediate', icon: IconTrophy},
    {label: 'Expert', value: 'expert', icon: IconOlympics},
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
    const {control, watch} = form;
    const [selectedTab, setSelectedTab] = useState(() => FORM_SECTIONS[0].value);

    // Watch primary muscles to filter them out from secondary
    const primaryMuscles = watch('exercise_definition.primary_muscle') ?? [];

    return (
        <Stack gap="lg">
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
                        description="Name should be specific and descriptive"
                        error={fieldState.error?.message}
                        label="Exercise name"
                        placeholder="e.g., Barbell Back Squat"
                        withAsterisk
                    />
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.level"
                render={({field}) => (
                    <Radio.Group
                        {...field}
                        label="Level"
                        value={field.value ?? LEVEL_OPTIONS[0].value}
                    >
                        <Group mt="xs">
                            {LEVEL_OPTIONS.map((option) => (
                                <Radio.Card
                                    key={option.value}
                                    p="sm"
                                    radius="md"
                                    value={option.value}
                                >
                                    <Group wrap="nowrap">
                                        <Radio.Indicator />
                                        <Text size="sm">{option.label}</Text>
                                    </Group>
                                </Radio.Card>
                            ))}
                        </Group>
                    </Radio.Group>
                )}
            />

            <Controller
                control={control}
                name="exercise_definition.category"
                render={({field}) => (
                    <Radio.Group
                        {...field}
                        label="Category"
                        value={field.value ?? ''}
                    >
                        <Group
                            gap="xs"
                            mt="xs"
                        >
                            {CATEGORY_OPTIONS.map((option) => (
                                <Radio.Card
                                    key={option.value}
                                    p="sm"
                                    radius="md"
                                    value={option.value}
                                >
                                    <Group wrap="nowrap">
                                        <Radio.Indicator />
                                        <Text size="sm">{option.label}</Text>
                                    </Group>
                                </Radio.Card>
                            ))}
                        </Group>
                    </Radio.Group>
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

            <Controller
                control={control}
                name="exercise_definition.force"
                render={({field}) => (
                    <Radio.Group
                        {...field}
                        label="Force"
                        value={field.value ?? ''}
                    >
                        <Group mt="xs">
                            {FORCE_OPTIONS.map((option) => (
                                <Radio.Card
                                    key={option.value}
                                    p="sm"
                                    radius="md"
                                    value={option.value}
                                >
                                    <Group wrap="nowrap">
                                        <Radio.Indicator />
                                        <Text size="sm">{option.label}</Text>
                                    </Group>
                                </Radio.Card>
                            ))}
                        </Group>
                    </Radio.Group>
                )}
            />

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

            <SegmentedControl
                data={FORM_SECTIONS}
                fullWidth
                onChange={setSelectedTab}
                radius="md"
                size="md"
                value={selectedTab}
            />

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
                                    c="dimmed"
                                    size="sm"
                                >
                                    Describe each step to perform the exercise correctly
                                </Text>

                                <Stack gap="sm">
                                    {instructions.map((instruction, index) => (
                                        <Group
                                            align="flex-start"
                                            gap="xs"
                                            key={index}
                                            wrap="nowrap"
                                        >
                                            <Indicator
                                                label={index + 1}
                                                position="top-start"
                                                size={20}
                                                style={{flex: 1}}
                                            >
                                                <TextInput
                                                    aria-label={`Step ${index + 1}`}
                                                    onChange={(e) =>
                                                        handleUpdateInstruction(index, e.currentTarget.value)
                                                    }
                                                    placeholder="Describe what to do"
                                                    value={instruction}
                                                    w="100%"
                                                />
                                            </Indicator>

                                            <ActionIcon
                                                aria-label={`Remove step ${index + 1}`}
                                                color="red"
                                                onClick={() => handleRemoveInstruction(index)}
                                                size="lg"
                                                variant="light"
                                            >
                                                <IconTrash size={18} />
                                            </ActionIcon>
                                        </Group>
                                    ))}
                                </Stack>

                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    onClick={handleAddInstruction}
                                    size="md"
                                    variant="light"
                                >
                                    Add step
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
                            <Radio.Group
                                {...field}
                                label="Mechanics"
                                value={field.value ?? ''}
                            >
                                <Group mt="xs">
                                    {MECHANICS_OPTIONS.map((option) => (
                                        <Radio.Card
                                            key={option.value}
                                            p="sm"
                                            radius="md"
                                            value={option.value}
                                        >
                                            <Group wrap="nowrap">
                                                <Radio.Indicator />
                                                <Text size="sm">{option.label}</Text>
                                            </Group>
                                        </Radio.Card>
                                    ))}
                                </Group>
                            </Radio.Group>
                        )}
                    />

                    <Controller
                        control={control}
                        name="exercise_definition.movement_pattern"
                        render={({field}) => (
                            <Radio.Group
                                {...field}
                                label="Movement pattern"
                                value={field.value ?? ''}
                            >
                                <Group
                                    gap="xs"
                                    mt="xs"
                                >
                                    {MOVEMENT_PATTERN_OPTIONS.map((option) => (
                                        <Radio.Card
                                            key={option.value}
                                            p="sm"
                                            radius="md"
                                            value={option.value}
                                        >
                                            <Group wrap="nowrap">
                                                <Radio.Indicator />
                                                <Text size="sm">{option.label}</Text>
                                            </Group>
                                        </Radio.Card>
                                    ))}
                                </Group>
                            </Radio.Group>
                        )}
                    />
                </>
            )}
        </Stack>
    );
}
