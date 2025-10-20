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
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {useState} from 'react';
import {Controller} from 'react-hook-form';

import {ChipSelect} from '@/components/ChipSelect';

import {NutritionInputs} from '../../components';
import {
    COOKING_METHOD_OPTIONS,
    DIET_TYPE_OPTIONS,
    DIFFICULTY_OPTIONS,
    DISH_TYPE_OPTIONS,
    FORM_SECTIONS,
    MEAL_TYPE_OPTIONS,
    RecipeDefinition,
    RecipeFormProps,
} from '../../lib';

type RecipeInstructionsValue = NonNullable<RecipeDefinition['instructions']>;
type RecipeInstructionStep = RecipeInstructionsValue['instructions'][number];
type SectionValue = (typeof FORM_SECTIONS)[number]['value'];

const DEFAULT_RECIPE_INSTRUCTIONS: RecipeInstructionsValue = {
    instructions: [],
    media_url: null,
};

export default function RecipeForm({form}: RecipeFormProps) {
    const {control} = form;
    const [selectedTab, setSelectedTab] = useState<SectionValue>(FORM_SECTIONS[0].value);

    const handleTabChange = (value: string) => {
        setSelectedTab(value as SectionValue);
    };

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

            {/* Recipe name */}
            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        placeholder="Name of recipe. e.g. High-Protein Chicken Salad"
                        radius="xl"
                        required
                        size="xl"
                        variant="filled"
                    />
                )}
            />

            {/* Difficulty */}
            <Controller
                control={control}
                name="recipe_definition.difficulty"
                render={({field}) => (
                    <Radio.Group
                        {...field}
                        label={
                            <Text
                                fw="bold"
                                size="sm"
                            >
                                Difficulty
                            </Text>
                        }
                        value={field.value ?? ''}
                    >
                        <Group mt="xs">
                            {DIFFICULTY_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <Radio.Card
                                        key={option.value}
                                        p="xs"
                                        radius="xl"
                                        value={option.value}
                                        w="fit-content"
                                    >
                                        <Group wrap="nowrap">
                                            <Radio.Indicator size="xs" />
                                            <Icon size={16} />
                                            <Text size="sm">{option.label}</Text>
                                        </Group>
                                    </Radio.Card>
                                );
                            })}
                        </Group>
                    </Radio.Group>
                )}
            />

            {/* Meal types */}
            <Controller
                control={control}
                name="recipe_definition.meal_types"
                render={({field}) => (
                    <ChipSelect
                        {...field}
                        data={MEAL_TYPE_OPTIONS}
                        label={
                            <Text
                                fw={600}
                                size="sm"
                            >
                                Meal Types
                            </Text>
                        }
                        multiple
                        radius="xl"
                        size="sm"
                        value={field.value ?? []}
                        variant="outline"
                    />
                )}
            />

            {/* Dish type */}
            <Controller
                control={control}
                name="recipe_definition.dish_type"
                render={({field}) => (
                    <Radio.Group
                        {...field}
                        label={
                            <Text
                                fw={600}
                                size="sm"
                            >
                                Dish Type
                            </Text>
                        }
                        value={field.value ?? ''}
                    >
                        <Group
                            gap="xs"
                            mt="xs"
                        >
                            {DISH_TYPE_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <Radio.Card
                                        key={option.value}
                                        p="xs"
                                        radius="xl"
                                        value={option.value}
                                        w="fit-content"
                                    >
                                        <Group wrap="nowrap">
                                            <Radio.Indicator size="xs" />
                                            <Icon size={16} />
                                            <Text size="sm">{option.label}</Text>
                                        </Group>
                                    </Radio.Card>
                                );
                            })}
                        </Group>
                    </Radio.Group>
                )}
            />

            {/* Time + servings */}
            <Group
                grow
                wrap="nowrap"
            >
                <Controller
                    control={control}
                    name="recipe_definition.prep_time_minutes"
                    render={({field}) => (
                        <NumberInput
                            {...field}
                            decimalScale={0}
                            label="Prep Time"
                            min={0}
                            placeholder="15"
                            radius="xl"
                            size="sm"
                            suffix=" min"
                            value={field.value ?? undefined}
                            variant="filled"
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="recipe_definition.cook_time_minutes"
                    render={({field}) => (
                        <NumberInput
                            {...field}
                            decimalScale={0}
                            label="Cook Time"
                            min={0}
                            placeholder="25"
                            radius="xl"
                            size="sm"
                            suffix=" min"
                            value={field.value ?? undefined}
                            variant="filled"
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="recipe_definition.servings"
                    render={({field}) => (
                        <NumberInput
                            {...field}
                            decimalScale={0}
                            label="Servings"
                            min={1}
                            placeholder="4"
                            radius="xl"
                            size="sm"
                            value={field.value ?? undefined}
                            variant="filled"
                        />
                    )}
                />
            </Group>

            {/* Diet types */}
            <Controller
                control={control}
                name="recipe_definition.diet_types"
                render={({field}) => (
                    <MultiSelect
                        {...field}
                        clearable
                        data={DIET_TYPE_OPTIONS}
                        description="Dietary restrictions met"
                        label="Diet Types"
                        placeholder="Select diet types"
                        radius="xl"
                        size="sm"
                        value={field.value ?? []}
                        variant="filled"
                    />
                )}
            />

            {/* Media */}
            <Controller
                control={control}
                name="media"
                render={({field}) => (
                    <TextInput
                        {...field}
                        description="Image or video URL for this recipe"
                        label="Media URL"
                        onChange={(e) => {
                            const url = e.currentTarget.value;
                            field.onChange(url ? {url, type: 'image'} : undefined);
                        }}
                        placeholder="https://example.com/recipe.jpg"
                        radius="xl"
                        size="sm"
                        type="url"
                        value={field.value?.url ?? ''}
                        variant="filled"
                    />
                )}
            />

            <SegmentedControl
                data={[...FORM_SECTIONS]}
                onChange={handleTabChange}
                radius="xl"
                size="lg"
                value={selectedTab}
            />

            {selectedTab === 'instructions' && (
                <Controller
                    control={control}
                    name="recipe_definition.instructions"
                    render={({field}) => {
                        const instructionsObj = (field.value ?? DEFAULT_RECIPE_INSTRUCTIONS) as RecipeInstructionsValue;
                        const instructions = (instructionsObj.instructions ?? []) as RecipeInstructionStep[];

                        const handleAddInstruction = () => {
                            field.onChange({
                                ...instructionsObj,
                                instructions: [...instructions, {instruction: '', media_url: null}],
                            });
                        };

                        const handleRemoveInstruction = (index: number) => {
                            const updated = instructions.filter((_, i) => i !== index);
                            field.onChange({
                                ...instructionsObj,
                                instructions: updated,
                            });
                        };

                        const handleUpdateInstruction = (index: number, value: string) => {
                            const updated = [...instructions];
                            const current = updated[index];
                            updated[index] = {
                                ...current,
                                instruction: value,
                            };

                            field.onChange({
                                ...instructionsObj,
                                instructions: updated,
                            });
                        };

                        return (
                            <Stack gap="md">
                                <Text
                                    c="dimmed"
                                    size="md"
                                >
                                    Describe step-by-step instructions to prepare the recipe
                                </Text>

                                {instructions.map((instructionStep, index) => (
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
                                                placeholder="Describe what to do"
                                                radius="xl"
                                                size="md"
                                                value={instructionStep?.instruction ?? ''}
                                                variant="filled"
                                            />
                                        </Indicator>

                                        <ActionIcon
                                            color="red"
                                            onClick={() => handleRemoveInstruction(index)}
                                            radius="xl"
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
                                    radius="xl"
                                    size="md"
                                    variant="light"
                                    w="max-content"
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
                        name="recipe_definition.cooking_methods"
                        render={({field}) => (
                            <MultiSelect
                                {...field}
                                clearable
                                data={COOKING_METHOD_OPTIONS}
                                description="Methods used"
                                label="Cooking Methods"
                                placeholder="Select cooking methods"
                                radius="xl"
                                searchable
                                size="sm"
                                value={field.value ?? []}
                                variant="filled"
                            />
                        )}
                    />

                    <NutritionInputs form={form} />
                </>
            )}
        </Stack>
    );
}
