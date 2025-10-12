import {Alert, Divider, Grid, NumberInput, Paper, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {InfoIcon} from '@phosphor-icons/react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../contentForm';

interface RecipeFormProps {
    form: UseFormReturn<ContentFormValues>;
}

/**
 * RecipeForm - Recipe content form
 *
 * Follows WorkoutForm/MealForm pattern:
 * - Uses Controller from react-hook-form
 * - Clean, minimal layout with Stack
 * - Type-specific fields for recipe metadata
 */
export default function RecipeForm({form}: RecipeFormProps) {
    const {control} = form;

    return (
        <Stack gap="md">
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

            {/* Content Name */}
            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Recipe Name"
                        placeholder="e.g., High-Protein Chicken Salad"
                        required
                        size="md"
                    />
                )}
            />

            {/* Instructions */}
            <Controller
                control={control}
                name="instructions"
                render={({field, fieldState}) => (
                    <Textarea
                        {...field}
                        autosize
                        error={fieldState.error?.message}
                        label="Cooking Instructions"
                        maxRows={8}
                        minRows={4}
                        placeholder="Step-by-step instructions:&#10;1. Preheat oven to 375°F...&#10;2. Season chicken with...&#10;3. Bake for 25 minutes..."
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label="Recipe Details (Optional)"
                labelPosition="left"
                mb="sm"
                mt="md"
            />

            {/* Time & Servings */}
            <Grid>
                <Grid.Col span={4}>
                    <Controller
                        control={control}
                        name="recipe_metadata.prep_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Preparation time"
                                label="Prep Time"
                                min={0}
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
                        name="recipe_metadata.cook_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Cooking time"
                                label="Cook Time"
                                min={0}
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
                        name="recipe_metadata.servings"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Number of servings"
                                label="Servings"
                                min={1}
                                placeholder="4"
                                size="md"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
            </Grid>

            {/* Placeholder for Ingredients */}
            <Paper
                p="xl"
                radius="md"
                style={{
                    backgroundColor: 'var(--mantine-color-blue-0)',
                    border: '1px dashed var(--mantine-color-blue-3)',
                }}
                withBorder
            >
                <Alert
                    color="blue"
                    icon={<InfoIcon size={20} />}
                    radius="md"
                    title="Ingredients Management"
                    variant="light"
                >
                    <Text size="sm">
                        Ingredient selection and management will be implemented in the next phase. For now, you can list
                        ingredients in the cooking instructions field.
                    </Text>
                </Alert>
            </Paper>
        </Stack>
    );
}
