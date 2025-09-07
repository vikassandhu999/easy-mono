import {
    Group,
    NumberInput,
    Textarea,
    MultiSelect,
    Paper,
    Stack,
    Text,
    Divider,
    Button,
    Flex,
    TextInput,
    ActionIcon,
    Select,
    Checkbox,
} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';
import {FormValues} from '../types.ts';
import {parse_input_props} from '@/utils/parse_input_props.tsx';
import {IconPlus, IconTrash} from '@tabler/icons-react';

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
    {value: 'easy', label: 'Easy'},
    {value: 'medium', label: 'Medium'},
    {value: 'hard', label: 'Hard'},
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
    const {watch, setValue} = form;
    const ingredients = watch('recipe_metadata.ingredients') || [];

    const addIngredient = () => {
        const currentIngredients = ingredients || [];
        const newIngredients = [...currentIngredients, {name: '', quantity: 0, unit: '', notes: ''}];
        setValue('recipe_metadata.ingredients', newIngredients);
    };

    const removeIngredient = (index: number) => {
        const currentIngredients = ingredients || [];
        const newIngredients = currentIngredients.filter((_: any, i: number) => i !== index);
        setValue('recipe_metadata.ingredients', newIngredients);
    };

    const updateIngredient = (index: number, field: string, value: any) => {
        const currentIngredients = ingredients || [];
        const newIngredients = [...currentIngredients];
        newIngredients[index] = {...newIngredients[index], [field]: value};
        setValue('recipe_metadata.ingredients', newIngredients);
    };

    return (
        <Paper
            p="md"
            withBorder
        >
            <Stack gap="md">
                <Text
                    size="lg"
                    fw={600}
                >
                    Recipe Metadata
                </Text>

                {/* Basic Recipe Info */}
                <Group grow>
                    <Controller
                        name="recipe_metadata.servings_yield"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Servings Yield"
                                placeholder="4"
                                min={1}
                                max={50}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.prep_time_minutes"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Prep Time (minutes)"
                                placeholder="15"
                                min={0}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.cook_time_minutes"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Cook Time (minutes)"
                                placeholder="30"
                                min={0}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Controller
                    name="recipe_metadata.difficulty"
                    control={form.control}
                    render={(props) => (
                        <Select
                            label="Difficulty"
                            placeholder="Select difficulty level"
                            data={DIFFICULTY_LEVELS}
                            {...parse_input_props(props)}
                        />
                    )}
                />

                <Divider />

                {/* Nutrition per Serving */}
                <Text
                    size="md"
                    fw={500}
                >
                    Nutrition per Serving
                </Text>
                <Group grow>
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.calories"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Calories"
                                placeholder="300"
                                min={0}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.macros.protein_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Protein (g)"
                                placeholder="25"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.macros.carbs_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Carbs (g)"
                                placeholder="30"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.macros.fats_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Fats (g)"
                                placeholder="10"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.macros.fiber_g"
                        control={form.control}
                        render={({field, fieldState}) => (
                            <NumberInput
                                label="Fiber (g)"
                                placeholder="5"
                                min={0}
                                step={0.1}
                                decimalScale={1}
                                error={fieldState.error?.message}
                                {...field}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.nutrition_per_serving.serving_size"
                        control={form.control}
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
                    size="md"
                    fw={500}
                >
                    Recipe Classification
                </Text>
                <Group grow>
                    <Controller
                        name="recipe_metadata.meal_types"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Meal Types"
                                placeholder="Select meal types"
                                data={MEAL_TYPES}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.cooking_methods"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Cooking Methods"
                                placeholder="Select cooking methods"
                                data={COOKING_METHODS}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Group grow>
                    <Controller
                        name="recipe_metadata.dietary_flags"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Dietary Flags"
                                placeholder="Select dietary preferences"
                                data={DIETARY_FLAGS}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                    <Controller
                        name="recipe_metadata.equipment_needed"
                        control={form.control}
                        render={(props) => (
                            <MultiSelect
                                label="Equipment Needed"
                                placeholder="Select required equipment"
                                data={EQUIPMENT_OPTIONS}
                                searchable
                                clearable
                                {...parse_input_props(props)}
                            />
                        )}
                    />
                </Group>

                <Controller
                    name="recipe_metadata.meal_prep_friendly"
                    control={form.control}
                    render={({field, fieldState}) => (
                        <Checkbox
                            label="Meal Prep Friendly"
                            checked={field.value}
                            onChange={field.onChange}
                            error={fieldState.error?.message}
                        />
                    )}
                />

                <Divider />

                {/* Ingredients */}
                <Flex
                    justify="space-between"
                    align="center"
                >
                    <Text
                        size="md"
                        fw={500}
                    >
                        Ingredients
                    </Text>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        size="sm"
                        variant="light"
                        onClick={addIngredient}
                    >
                        Add Ingredient
                    </Button>
                </Flex>

                {ingredients.map((_: any, index: number) => (
                    <Group
                        key={index}
                        gap="sm"
                    >
                        <TextInput
                            placeholder="Ingredient name"
                            flex={2}
                            value={ingredients[index]?.name || ''}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        />
                        <NumberInput
                            placeholder="Qty"
                            w={80}
                            min={0}
                            step={0.25}
                            decimalScale={2}
                            value={ingredients[index]?.quantity || 0}
                            onChange={(val) => updateIngredient(index, 'quantity', val)}
                        />
                        <TextInput
                            placeholder="Unit"
                            w={80}
                            value={ingredients[index]?.unit || ''}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        />
                        <TextInput
                            placeholder="Notes"
                            flex={1}
                            value={ingredients[index]?.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                        />
                        <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeIngredient(index)}
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                ))}

                <Divider />

                {/* Storage */}
                <Text
                    size="md"
                    fw={500}
                >
                    Storage & Tips
                </Text>
                <Controller
                    name="recipe_metadata.storage_instructions"
                    control={form.control}
                    render={(props) => (
                        <Textarea
                            label="Storage Instructions"
                            placeholder="Storage and reheating instructions (one per line)"
                            autosize
                            minRows={2}
                            maxRows={4}
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
