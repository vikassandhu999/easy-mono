import {Divider, Grid, MultiSelect, NumberInput, Select, Stack, Textarea, TextInput, Title} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../contentForm';

interface RecipeFormProps {
    form: UseFormReturn<ContentFormValues>;
}

const MEAL_TYPE_OPTIONS = [
    {label: 'Breakfast', value: 'breakfast'},
    {label: 'Lunch', value: 'lunch'},
    {label: 'Dinner', value: 'dinner'},
    {label: 'Snack', value: 'snack'},
    {label: 'Dessert', value: 'dessert'},
    {label: 'Beverage', value: 'beverage'},
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

const DIFFICULTY_OPTIONS = [
    {label: 'Easy', value: 'easy'},
    {label: 'Medium', value: 'medium'},
    {label: 'Hard', value: 'hard'},
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

const DISH_TYPE_OPTIONS = [
    {label: 'Main Course', value: 'main'},
    {label: 'Side Dish', value: 'side'},
    {label: 'Appetizer', value: 'appetizer'},
    {label: 'Salad', value: 'salad'},
    {label: 'Soup', value: 'soup'},
    {label: 'Smoothie', value: 'smoothie'},
];

/**
 * RecipeForm - Comprehensive recipe content form
 *
 * Visual Hierarchy:
 * 1. Essential fields (Name, Description) - Most important
 * 2. Time & Yield (Prep, Cook, Servings) - Practical info
 * 3. Classification (Meal Type, Diet, Difficulty) - Discovery metadata
 * 4. Nutrition (Optional) - Detailed tracking
 */
export default function RecipeForm({form}: RecipeFormProps) {
    const {control} = form;

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

            {/* SECTION 1: Essential Info */}
            <Stack gap="md">
                <Controller
                    control={control}
                    name="name"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            error={fieldState.error?.message}
                            label="Name"
                            placeholder="e.g., High-Protein Chicken Salad"
                            required
                            size="md"
                            styles={{
                                label: {
                                    fontSize: '16px',
                                    fontWeight: 600,
                                },
                            }}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="description"
                    render={({field, fieldState}) => (
                        <Textarea
                            {...field}
                            autosize
                            error={fieldState.error?.message}
                            label="Description"
                            maxRows={8}
                            minRows={4}
                            placeholder="A nutritious and delicious salad packed with lean protein and fresh vegetables..."
                            size="md"
                            value={field.value ?? ''}
                        />
                    )}
                />
            </Stack>

            <Divider />

            {/* SECTION 2: Time & Yield */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Time & Yield
                </Title>

                <Grid>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.prep_time_minutes"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={0}
                                    label="Prep Time"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="15"
                                    size="md"
                                    suffix=" min"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.cook_time_minutes"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={0}
                                    label="Cook Time"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="25"
                                    size="md"
                                    suffix=" min"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.servings"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={0}
                                    label="Servings"
                                    min={1}
                                    onChange={field.onChange}
                                    placeholder="4"
                                    size="md"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                </Grid>
            </Stack>

            <Divider />

            {/* SECTION 3: Classification */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Classification
                </Title>

                <Grid>
                    <Grid.Col span={6}>
                        <Controller
                            control={control}
                            name="recipe_definition.difficulty"
                            render={({field}) => (
                                <Select
                                    {...field}
                                    clearable
                                    data={DIFFICULTY_OPTIONS}
                                    label="Difficulty"
                                    placeholder="Select difficulty"
                                    size="md"
                                    value={field.value ?? null}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Controller
                            control={control}
                            name="recipe_definition.dish_type"
                            render={({field}) => (
                                <Select
                                    {...field}
                                    clearable
                                    data={DISH_TYPE_OPTIONS}
                                    label="Dish Type"
                                    placeholder="Select type"
                                    size="md"
                                    value={field.value ?? null}
                                />
                            )}
                        />
                    </Grid.Col>
                </Grid>

                <Controller
                    control={control}
                    name="recipe_definition.meal_types"
                    render={({field}) => (
                        <MultiSelect
                            {...field}
                            clearable
                            data={MEAL_TYPE_OPTIONS}
                            description="When to serve"
                            label="Meal Types"
                            placeholder="Select meal types"
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />

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
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />

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
                            searchable
                            size="md"
                            value={field.value ?? []}
                        />
                    )}
                />
            </Stack>

            <Divider />

            {/* SECTION 4: Nutrition (Optional) */}
            <Stack gap="md">
                <Title
                    order={6}
                    size="sm"
                    style={{color: 'var(--mantine-color-dimmed)', fontWeight: 600, textTransform: 'uppercase'}}
                >
                    Nutrition (Optional, Per Serving)
                </Title>

                <Grid>
                    <Grid.Col span={6}>
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.calories"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={0}
                                    label="Calories"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="350"
                                    size="md"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.protein_g"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={1}
                                    label="Protein"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="30"
                                    size="md"
                                    suffix=" g"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.carbs_g"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={1}
                                    label="Carbs"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="25"
                                    size="md"
                                    suffix=" g"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.fats_g"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={1}
                                    label="Fats"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="15"
                                    size="md"
                                    suffix=" g"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Controller
                            control={control}
                            name="recipe_definition.nutrition_per_serving.macros.fiber_g"
                            render={({field}) => (
                                <NumberInput
                                    decimalScale={1}
                                    label="Fiber"
                                    min={0}
                                    onChange={field.onChange}
                                    placeholder="5"
                                    size="md"
                                    suffix=" g"
                                    value={field.value ?? ''}
                                />
                            )}
                        />
                    </Grid.Col>
                </Grid>
            </Stack>
        </Stack>
    );
}
