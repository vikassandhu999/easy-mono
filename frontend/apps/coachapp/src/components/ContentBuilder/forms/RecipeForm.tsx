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
import {IconChefHat, IconFlame, IconLeaf, IconPlus, IconSalad, IconTrash, IconTrophy} from '@tabler/icons-react';
import {useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ChipSelect} from '@/components/ChipSelect';

import {ContentFormValues} from '../contentForm';

interface RecipeFormProps {
    form: UseFormReturn<ContentFormValues>;
}

const DIFFICULTY_OPTIONS = [
    {label: 'Easy', value: 'easy', icon: IconTrophy},
    {label: 'Medium', value: 'medium', icon: IconTrophy},
    {label: 'Hard', value: 'hard', icon: IconTrophy},
];

const MEAL_TYPE_OPTIONS = [
    {label: 'Breakfast', value: 'breakfast', icon: IconChefHat},
    {label: 'Lunch', value: 'lunch', icon: IconSalad},
    {label: 'Dinner', value: 'dinner', icon: IconFlame},
    {label: 'Snack', value: 'snack', icon: IconLeaf},
    {label: 'Dessert', value: 'dessert', icon: IconChefHat},
    {label: 'Beverage', value: 'beverage', icon: IconLeaf},
];

const DISH_TYPE_OPTIONS = [
    {label: 'Main Course', value: 'main', icon: IconFlame},
    {label: 'Side Dish', value: 'side', icon: IconSalad},
    {label: 'Appetizer', value: 'appetizer', icon: IconLeaf},
    {label: 'Salad', value: 'salad', icon: IconSalad},
    {label: 'Soup', value: 'soup', icon: IconFlame},
    {label: 'Smoothie', value: 'smoothie', icon: IconLeaf},
];

const DIET_TYPE_OPTIONS = [
    {label: 'Vegan', value: 'vegan'},
    {label: 'Vegetarian', value: 'vegetarian'},
    {label: 'Gluten-Free', value: 'gluten_free'},
    {label: 'Dairy-Free', value: 'dairy_free'},
    {label: 'Keto', value: 'keto'},
    {label: 'Paleo', value: 'paleo'},
    {label: 'Low-Carb', value: 'low_carb'},
    {label: 'High-Protein', value: 'high_protein'},
];

const COOKING_METHOD_OPTIONS = [
    {label: 'Baking', value: 'baking'},
    {label: 'Stovetop', value: 'stovetop'},
    {label: 'Grilling', value: 'grilling'},
    {label: 'No Cook', value: 'no_cook'},
    {label: 'Slow Cooker', value: 'slow_cooker'},
    {label: 'Instant Pot', value: 'instant_pot'},
    {label: 'Air Fryer', value: 'air_fryer'},
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

export default function RecipeForm({form}: RecipeFormProps) {
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
                        placeholder="Name of recipe. e.g. High-Protein Chicken Salad"
                        radius="xl"
                        required
                        size="xl"
                        variant="filled"
                    />
                )}
            />

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
                            {DIFFICULTY_OPTIONS.map((option) => (
                                <Radio.Card
                                    key={option.value}
                                    p="xs"
                                    radius="xl"
                                    value={option.value}
                                    w="fit-content"
                                >
                                    <Group wrap="nowrap">
                                        <Radio.Indicator size="xs" />
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
                data={FORM_SECTIONS}
                onChange={setSelectedTab}
                radius="xl"
                size="lg"
                value={selectedTab}
            ></SegmentedControl>

            {selectedTab === 'instructions' && (
                <Controller
                    control={control}
                    name="recipe_definition.instructions"
                    render={({field}) => {
                        const instructionsObj = field.value || {instructions: []};
                        const instructions = instructionsObj.instructions || [];

                        const handleAddInstruction = () => {
                            field.onChange({
                                ...instructionsObj,
                                instructions: [...instructions, {instruction: '', media_url: null}],
                            });
                        };

                        const handleRemoveInstruction = (index: number) => {
                            const newInstructions = instructions.filter((_: any, i: number) => i !== index);
                            field.onChange({
                                ...instructionsObj,
                                instructions: newInstructions.length > 0 ? newInstructions : [],
                            });
                        };

                        const handleUpdateInstruction = (index: number, value: string) => {
                            const newInstructions = [...instructions];
                            newInstructions[index] = {
                                ...newInstructions[index],
                                instruction: value,
                            };
                            field.onChange({
                                ...instructionsObj,
                                instructions: newInstructions,
                            });
                        };

                        return (
                            <Stack gap="md">
                                <Text
                                    fs="italic"
                                    size="xs"
                                >
                                    You can describe step-by-step instructions to prepare
                                </Text>

                                {instructions.map((instructionStep: any, index: number) => (
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
                                                radius="xl"
                                                size="md"
                                                value={instructionStep?.instruction || ''}
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

                    <Text
                        fw={600}
                        mt="md"
                        size="sm"
                    >
                        Nutrition (Per Serving)
                    </Text>

                    <Group
                        grow
                        wrap="nowrap"
                    >
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.calories"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    decimalScale={0}
                                    label="Calories"
                                    min={0}
                                    placeholder="350"
                                    radius="xl"
                                    size="sm"
                                    value={field.value ?? undefined}
                                    variant="filled"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.protein_g"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    decimalScale={1}
                                    label="Protein"
                                    min={0}
                                    placeholder="30"
                                    radius="xl"
                                    size="sm"
                                    suffix=" g"
                                    value={field.value ?? undefined}
                                    variant="filled"
                                />
                            )}
                        />
                    </Group>

                    <Group
                        grow
                        wrap="nowrap"
                    >
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.carbs_g"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    decimalScale={1}
                                    label="Carbs"
                                    min={0}
                                    placeholder="25"
                                    radius="xl"
                                    size="sm"
                                    suffix=" g"
                                    value={field.value ?? undefined}
                                    variant="filled"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.fats_g"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    decimalScale={1}
                                    label="Fats"
                                    min={0}
                                    placeholder="15"
                                    radius="xl"
                                    size="sm"
                                    suffix=" g"
                                    value={field.value ?? undefined}
                                    variant="filled"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.fiber_g"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    decimalScale={1}
                                    label="Fiber"
                                    min={0}
                                    placeholder="5"
                                    radius="xl"
                                    size="sm"
                                    suffix=" g"
                                    value={field.value ?? undefined}
                                    variant="filled"
                                />
                            )}
                        />
                    </Group>
                </>
            )}
        </Stack>
    );
}
