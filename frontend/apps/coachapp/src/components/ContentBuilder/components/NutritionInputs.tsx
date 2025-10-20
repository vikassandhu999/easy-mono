import {Group, NumberInput, Text} from '@mantine/core';
import {Controller, UseFormReturn} from 'react-hook-form';

import {ContentFormValues} from '../lib/types';

/**
 * NutritionInputs - Reusable nutrition fields for recipe forms
 *
 * Provides consistent nutrition input fields with proper validation
 * and formatting (calories, protein, carbs, fats, fiber).
 */

export interface NutritionInputsProps {
    form: UseFormReturn<ContentFormValues>;
}

export function NutritionInputs({form}: NutritionInputsProps) {
    const {control} = form;

    return (
        <>
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
    );
}
