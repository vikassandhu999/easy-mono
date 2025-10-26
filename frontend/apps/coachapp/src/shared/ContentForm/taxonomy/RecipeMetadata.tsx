import {
    ActionIcon,
    Button,
    Checkbox,
    Divider,
    Flex,
    Group,
    MultiSelect,
    NumberInput,
    Paper,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {parse_input_props} from '@/utils/parse_input_props.tsx';

import {FormValues} from '../types.ts';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer', 'side_dish'];

const COOKING_METHODS = [
    'baking',
    'grilling',
    'frying',
    'sauteing',
    'steaming',
    'boiling',
    'roasting',
    'slow_cooking',
    'pressure_cooking',
    'raw',
    'no_cook',
];

const DIETARY_FLAGS = [
    'vegetarian',
    'vegan',
    'gluten_free',
    'dairy_free',
    'nut_free',
    'low_carb',
    'keto',
    'paleo',
    'whole30',
    'low_sodium',
    'heart_healthy',
];

const DIFFICULTY_LEVELS = [
    {label: 'Easy', value: 'easy'},
    {label: 'Medium', value: 'medium'},
    {label: 'Hard', value: 'hard'},
];

const EQUIPMENT_OPTIONS = [
    'oven',
    'stovetop',
    'microwave',
    'slow_cooker',
    'pressure_cooker',
    'grill',
    'food_processor',
    'blender',
    'mixer',
    'none',
];

export function RecipeMetadataForm({form}: {form: UseFormReturn<FormValues>}) {
    const {setValue, watch} = form;
    const ingredients = watch('recipe_definition.ingredients') || [];

    const addIngredient = () => {
        const currentIngredients = ingredients || [];
        const newIngredients = [...currentIngredients, {name: '', notes: '', quantity: 0, unit: ''}];
        setValue('recipe_definition.ingredients', newIngredients);
    };

    const removeIngredient = (index: number) => {
        const currentIngredients = ingredients || [];
        const newIngredients = currentIngredients.filter((_: any, i: number) => i !== index);
        setValue('recipe_definition.ingredients', newIngredients);
    };

    const updateIngredient = (index: number, field: string, value: any) => {
        const currentIngredients = ingredients || [];
        const newIngredients = [...currentIngredients];
        newIngredients[index] = {...newIngredients[index], [field]: value};
        setValue('recipe_definition.ingredients', newIngredients);
    };

    return (
        <Paper
            p="md"
            withBorder
        >
            <Stack gap="md">
                <Text
                    fw={600}
                    size="lg"
                >
                    Recipe Metadata
                </Text>

                {/* Basic Recipe Info */}
                <Group grow>
                    <Controller
                        control={form.control}
                        name="recipe_definition.servings_yield"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Servings Yield"
                                max={50}
                                min={1}
                                placeholder="4"
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.prep_time_minutes"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Prep Time (minutes)"
                                min={0}
                                placeholder="15"
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.cook_time_minutes"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Cook Time (minutes)"
                                min={0}
                                placeholder="30"
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={form.control}
                    name="recipe_definition.difficulty"
                    render={(props) => (
                        <Select
                            data={DIFFICULTY_LEVELS}
                            label="Difficulty"
                            placeholder="Select difficulty level"
                            {...parse_input_props(props)}
                        />
                    )}
                />

                <Divider />

                {/* Nutrition per Serving */}
                <Text
                    fw={500}
                    size="md"
                >
                    Nutrition per Serving
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.calories"
                        render={({field, fieldState}) => (
                            <NumberInput
                                error={fieldState.error?.message}
                                label="Calories"
                                min={0}
                                placeholder="300"
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.macros.protein_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Protein (g)"
                                min={0}
                                placeholder="25"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.macros.carbs_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Carbs (g)"
                                min={0}
                                placeholder="30"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.macros.fats_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Fats (g)"
                                min={0}
                                placeholder="10"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.macros.fiber_g"
                        render={({field, fieldState}) => (
                            <NumberInput
                                decimalScale={1}
                                error={fieldState.error?.message}
                                label="Fiber (g)"
                                min={0}
                                placeholder="5"
                                step={0.1}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.nutrition_per_serving.serving_size"
                        render={(props) => (
                            <TextInput
                                label="Serving Size"
                                placeholder="1 cup"
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Divider />

                {/* Recipe Classification */}
                <Text
                    fw={500}
                    size="md"
                >
                    Recipe Classification
                </Text>
                <Group grow>
                    <Controller
                        control={form.control}
                        name="recipe_definition.meal_types"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={MEAL_TYPES}
                                label="Meal Types"
                                placeholder="Select meal types"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.cooking_methods"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={COOKING_METHODS}
                                label="Cooking Methods"
                                placeholder="Select cooking methods"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        control={form.control}
                        name="recipe_definition.dietary_flags"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={DIETARY_FLAGS}
                                label="Dietary Flags"
                                placeholder="Select dietary preferences"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="recipe_definition.equipment_needed"
                        render={(props) => (
                            <MultiSelect
                                clearable
                                data={EQUIPMENT_OPTIONS}
                                label="Equipment Needed"
                                placeholder="Select required equipment"
                                searchable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Controller
                    control={form.control}
                    name="recipe_definition.meal_prep_friendly"
                    render={({field, fieldState}) => (
                        <Checkbox
                            checked={field.value}
                            error={fieldState.error?.message}
                            label="Meal Prep Friendly"
                            onChange={field.onChange}
                        />
                    )}
                />

                <Divider />

                {/* Ingredients */}
                <Flex
                    align="center"
                    justify="space-between"
                >
                    <Text
                        fw={500}
                        size="md"
                    >
                        Ingredients
                    </Text>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={addIngredient}
                        size="sm"
                        variant="light"
                    >
                        Add Ingredient
                    </Button>
                </Flex>

                {ingredients.map((_: any, index: number) => (
                    <Group
                        gap="sm"
                        key={index}
                    >
                        <TextInput
                            flex={2}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                            placeholder="Ingredient name"
                            value={ingredients[index]?.name || ''}
                        />
                        <NumberInput
                            decimalScale={2}
                            min={0}
                            onChange={(val) => updateIngredient(index, 'quantity', val)}
                            placeholder="Qty"
                            step={0.25}
                            value={ingredients[index]?.quantity || 0}
                            w={80}
                        />
                        <TextInput
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            placeholder="Unit"
                            value={ingredients[index]?.unit || ''}
                            w={80}
                        />
                        <TextInput
                            flex={1}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            placeholder="Notes"
                            value={ingredients[index]?.notes || ''}
                        />
                        <ActionIcon
                            color="red"
                            onClick={() => removeIngredient(index)}
                            variant="light"
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                ))}

                <Divider />

                {/* Storage */}
                <Text
                    fw={500}
                    size="md"
                >
                    Storage & Tips
                </Text>
                <Controller
                    control={form.control}
                    name="recipe_definition.storage_instructions"
                    render={(props) => (
                        <Textarea
                            autosize
                            label="Storage Instructions"
                            maxRows={4}
                            minRows={2}
                            placeholder="Storage and reheating instructions (one per line)"
                            {...parse_input_props(props)}
                            onChange={(event) => {
                                const lines = event.target.value.split('\n').filter((line) => line.trim());
                                props.field.onChange(lines);
                            }}
                        />
                    )}
                />
            </Stack>
        </Paper>
    );
}
