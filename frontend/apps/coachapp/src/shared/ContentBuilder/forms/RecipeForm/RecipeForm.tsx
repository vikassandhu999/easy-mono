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
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {useState} from 'react';
import {Controller} from 'react-hook-form';

import {CheckboxButtonGroup, NutritionInputs, RadioCardGroup} from '../../components';
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
                        description="Name should be specific and descriptive"
                        error={fieldState.error?.message}
                        label="Recipe name"
                        placeholder="e.g., High-Protein Chicken Salad"
                        withAsterisk
                    />
                )}
            />

            {/* Difficulty */}
            <Controller
                control={control}
                name="recipe_definition.difficulty"
                render={({field}) => (
                    <RadioCardGroup
                        label="Difficulty"
                        onChange={field.onChange}
                        options={DIFFICULTY_OPTIONS}
                        value={field.value}
                    />
                )}
            />

            {/* Meal types */}
            <Controller
                control={control}
                name="recipe_definition.meal_types"
                render={({field}) => (
                    <CheckboxButtonGroup
                        label="Meal types"
                        onChange={field.onChange}
                        options={MEAL_TYPE_OPTIONS}
                        value={field.value ?? []}
                    />
                )}
            />

            {/* Dish type */}
            <Controller
                control={control}
                name="recipe_definition.dish_type"
                render={({field}) => (
                    <RadioCardGroup
                        label="Dish type"
                        onChange={field.onChange}
                        options={DISH_TYPE_OPTIONS}
                        value={field.value}
                    />
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
                            hideControls
                            label="Prep time"
                            min={0}
                            placeholder="15"
                            suffix=" min"
                            value={field.value ?? undefined}
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
                            hideControls
                            label="Cook time"
                            min={0}
                            placeholder="25"
                            suffix=" min"
                            value={field.value ?? undefined}
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
                            hideControls
                            label="Servings"
                            min={1}
                            placeholder="4"
                            value={field.value ?? undefined}
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
                        label="Diet types"
                        placeholder="Select diet types"
                        value={field.value ?? []}
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
                        label="Media URL (optional)"
                        onChange={(e) => {
                            const url = e.currentTarget.value;
                            field.onChange(url ? {url, type: 'image'} : undefined);
                        }}
                        placeholder="https://example.com/recipe.jpg"
                        type="url"
                        value={field.value?.url ?? ''}
                    />
                )}
            />

            <SegmentedControl
                data={[...FORM_SECTIONS]}
                fullWidth
                onChange={handleTabChange}
                size="md"
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
                                    size="sm"
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
                                            size={20}
                                            w="100%"
                                        >
                                            <TextInput
                                                flex={1}
                                                onChange={(e) => handleUpdateInstruction(index, e.currentTarget.value)}
                                                placeholder="Describe what to do"
                                                value={instructionStep?.instruction ?? ''}
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

                                <Button
                                    leftSection={<IconPlus size={18} />}
                                    onClick={handleAddInstruction}
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
                        name="recipe_definition.cooking_methods"
                        render={({field}) => (
                            <MultiSelect
                                {...field}
                                clearable
                                data={COOKING_METHOD_OPTIONS}
                                description="Methods used"
                                label="Cooking methods"
                                placeholder="Select cooking methods"
                                searchable
                                value={field.value ?? []}
                            />
                        )}
                    />

                    <NutritionInputs form={form} />
                </>
            )}
        </Stack>
    );
}
