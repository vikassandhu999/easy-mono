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
                        label="Name"
                        placeholder="e.g., High-Protein Chicken Salad"
                        required
                        size="md"
                    />
                )}
            />

            {/* Description */}
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
                        placeholder="Brief description of this recipe..."
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label="Details (Optional)"
                labelPosition="left"
                mb="sm"
                mt="md"
            />

            {/* Time & Servings */}
            <Grid>
                <Grid.Col span={4}>
                    <Controller
                        control={control}
                        name="recipe_definition.prep_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Prep time"
                                label="Prep"
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
                        name="recipe_definition.cook_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Cook time"
                                label="Cook"
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
                        name="recipe_definition.servings"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Servings"
                                label="Yields"
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
                    title="Coming Soon: Ingredients"
                    variant="light"
                >
                    <Text size="sm">
                        You can add ingredients in the next update. For now, include them in the instructions above.
                    </Text>
                </Alert>
            </Paper>
        </Stack>
    );
}
