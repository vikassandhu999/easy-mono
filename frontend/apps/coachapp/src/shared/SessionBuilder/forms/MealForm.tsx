import {Alert, Divider, Paper, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {InfoIcon} from '@phosphor-icons/react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {Content} from '@/services/contents';

import {SessionFormValues} from '../sessionForm';

interface MealFormProps {
    contentsMap: Record<string, Content>;
    form: UseFormReturn<SessionFormValues>;
    setContentsMap: React.Dispatch<React.SetStateAction<Record<string, Content>>>;
}

/**
 * MealForm - Meal session form (placeholder)
 *
 * TODO: Implement meal-specific form with:
 * - Meal sections (breakfast, lunch, dinner, snacks)
 * - Ingredient/recipe selection
 * - Nutrition tracking
 * - Portion sizes
 */
export default function MealForm({form}: MealFormProps) {
    const {control} = form;

    return (
        <Stack gap="md">
            {/* Hidden session type field */}
            <Controller
                control={control}
                name="session_type"
                render={({field}) => (
                    <input
                        {...field}
                        type="hidden"
                        value={field.value}
                    />
                )}
            />

            {/* Session Name */}
            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Name"
                        placeholder="Name of your meal plan"
                        required
                        size="md"
                    />
                )}
            />

            {/* Session Description */}
            <Controller
                control={control}
                name="description"
                render={({field, fieldState}) => (
                    <Textarea
                        {...field}
                        autosize
                        error={fieldState.error?.message}
                        label="Description"
                        maxRows={4}
                        minRows={2}
                        placeholder="Add a description"
                        size="md"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label="Meal Structure"
                labelPosition="left"
                mb="md"
                mt="xl"
            />

            {/* Placeholder Content */}
            <Paper
                p="xl"
                radius="lg"
                style={{backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))'}}
                withBorder
            >
                <Stack
                    align="center"
                    gap="md"
                >
                    <InfoIcon
                        color="var(--mantine-color-blue-6)"
                        size={48}
                    />
                    <Text
                        fw={600}
                        size="lg"
                        ta="center"
                    >
                        Meal Form Coming Soon
                    </Text>
                    <Text
                        c="dimmed"
                        maw={400}
                        size="sm"
                        ta="center"
                    >
                        The meal planning form is currently under development. It will include features for managing
                        ingredients, recipes, nutrition tracking, and meal scheduling.
                    </Text>
                </Stack>
            </Paper>

            <Alert
                color="blue"
                title="What's Coming"
                variant="light"
            >
                <Stack gap="xs">
                    <Text size="sm">• Ingredient and recipe selection</Text>
                    <Text size="sm">• Nutritional information tracking</Text>
                    <Text size="sm">• Meal categories (breakfast, lunch, dinner, snacks)</Text>
                    <Text size="sm">• Portion size management</Text>
                    <Text size="sm">• Macro and calorie calculations</Text>
                </Stack>
            </Alert>
        </Stack>
    );
}
