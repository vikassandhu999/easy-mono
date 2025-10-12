import {Divider, Grid, NumberInput, Stack, Textarea, TextInput} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../contentForm';

interface FoodFormProps {
    form: UseFormReturn<ContentFormValues>;
}

const UNIT_OPTIONS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'ml', 'serving'];

/**
 * FoodForm - Ingredient/Food content form
 *
 * Follows WorkoutForm/MealForm pattern:
 * - Uses Controller from react-hook-form
 * - Clean, minimal layout with Stack
 * - Type-specific fields for ingredient metadata
 */
export default function FoodForm({form}: FoodFormProps) {
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
                        label="Ingredient Name"
                        placeholder="e.g., Grilled Chicken Breast"
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
                        label="Preparation Notes"
                        maxRows={4}
                        minRows={2}
                        placeholder="Portion & prep notes:&#10;150g grilled chicken breast, medium heat..."
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label="Nutrition Info (Optional)"
                labelPosition="left"
                mb="sm"
                mt="md"
            />

            {/* Serving Size */}
            <Grid>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.serving_size.amount"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={2}
                                description="Standard serving amount"
                                label="Serving Amount"
                                min={0}
                                placeholder="100"
                                size="md"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.serving_size.unit"
                        render={({field}) => (
                            <TextInput
                                {...field}
                                description="Unit of measurement"
                                label="Unit"
                                list="unit-options"
                                placeholder="g, oz, cup..."
                                size="md"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                    <datalist id="unit-options">
                        {UNIT_OPTIONS.map((unit) => (
                            <option
                                key={unit}
                                value={unit}
                            />
                        ))}
                    </datalist>
                </Grid.Col>
            </Grid>

            {/* Macronutrients */}
            <Grid>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.nutrition_profile.macros.calories"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={0}
                                description="Per serving"
                                label="Calories"
                                min={0}
                                placeholder="150"
                                size="md"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.nutrition_profile.macros.protein_g"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={1}
                                description="Grams per serving"
                                label="Protein"
                                min={0}
                                placeholder="25"
                                size="md"
                                suffix=" g"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
            </Grid>

            <Grid>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.nutrition_profile.macros.carbs_g"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={1}
                                description="Grams per serving"
                                label="Carbs"
                                min={0}
                                placeholder="0"
                                size="md"
                                suffix=" g"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
                <Grid.Col span={6}>
                    <Controller
                        control={control}
                        name="ingredient_metadata.nutrition_profile.macros.fat_g"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                decimalScale={1}
                                description="Grams per serving"
                                label="Fat"
                                min={0}
                                placeholder="3"
                                size="md"
                                suffix=" g"
                                value={field.value ?? ''}
                            />
                        )}
                    />
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
