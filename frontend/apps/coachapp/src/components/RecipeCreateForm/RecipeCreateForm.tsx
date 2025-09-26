import {NumberInput, Select, Textarea, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import React from 'react';

import {CreateContentProps} from '@/api/contents.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';

interface RecipeCreateFormProps {
    onSubmit: (data: CreateContentProps) => Promise<void>;
    submitText: string;
}

interface RecipeFormValues {
    cook_time_minutes: number;
    description: string;
    difficulty: string;
    duration: number;
    instructions: string;
    name: string;
    prep_time_minutes: number;
    servings: number;
}

export const RecipeCreateForm: React.FC<RecipeCreateFormProps> = ({onSubmit, submitText}) => {
    const form = useForm<RecipeFormValues>({
        initialValues: {
            cook_time_minutes: 15,
            description: '',
            difficulty: 'medium',
            duration: 30,
            instructions: '',
            name: '',
            prep_time_minutes: 15,
            servings: 4,
        },
        validate: {
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Recipe name is required';
                }
                if (value.length < 3) {
                    return 'Recipe name must be at least 3 characters';
                }
                if (value.length > 255) {
                    return 'Recipe name must be less than 255 characters';
                }
                return null;
            },
            description: (value) => {
                if (value && value.length > 500) {
                    return 'Description must be less than 500 characters';
                }
                return null;
            },
            instructions: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Instructions are required';
                }
                return null;
            },
            duration: (value) => {
                if (!value || value <= 0) {
                    return 'Total time must be greater than 0';
                }
                return null;
            },
            servings: (value) => {
                if (!value || value <= 0) {
                    return 'Servings must be greater than 0';
                }
                return null;
            },
            prep_time_minutes: (value) => {
                if (!value || value < 0) {
                    return 'Prep time must be 0 or greater';
                }
                return null;
            },
            cook_time_minutes: (value) => {
                if (!value || value < 0) {
                    return 'Cook time must be 0 or greater';
                }
                return null;
            },
        },
    });

    const handleFormSubmit = async (values: RecipeFormValues) => {
        if (form.validate().hasErrors) {
            notifications.show({
                autoClose: 3000,
                color: 'red',
                message: 'Please fix the errors in the form',
                position: 'top-center',
                title: 'Validation Error',
            });
            return;
        }

        // Transform form values to CreateContentProps
        const recipeData: CreateContentProps = {
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            type: 'recipe',
            instructions: values.instructions.trim(),
            instructions_type: 'text',
            duration: values.duration,
            recipe_metadata: {
                servings: values.servings,
                difficulty: values.difficulty,
                prep_time_minutes: values.prep_time_minutes,
                cook_time_minutes: values.cook_time_minutes,
                total_time_minutes: values.prep_time_minutes + values.cook_time_minutes,
                cooking_methods: [],
                diet_types: [],
                meal_types: [],
                equipment_needed: [],
                ingredients: [],
                storage_instructions: [],
                meal_prep_friendly: false,
                nutrition_per_serving: {
                    calories: 0,
                    serving_size: '1 serving',
                    macros: {
                        protein_g: 0,
                        carbs_g: 0,
                        fats_g: 0,
                        fiber_g: 0,
                        sugar_g: 0,
                    },
                },
                derived_metrics: [],
                trackable_metrics: [],
            },
        };

        await onSubmit(recipeData);
    };

    // Update duration when prep or cook time changes
    React.useEffect(() => {
        const totalTime = form.values.prep_time_minutes + form.values.cook_time_minutes;
        if (totalTime !== form.values.duration) {
            form.setFieldValue('duration', totalTime);
        }
    }, [form.values.prep_time_minutes, form.values.cook_time_minutes, form.values.duration, form]);

    return (
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <FormSection>
                <TextInput
                    description="Give your recipe a catchy name"
                    label="Recipe Name"
                    placeholder="e.g., Grandma's Famous Chocolate Chip Cookies"
                    required
                    size="md"
                    withAsterisk
                    {...form.getInputProps('name')}
                />

                <Textarea
                    description="Brief description of your recipe"
                    label="Description"
                    placeholder="Describe what makes this recipe special..."
                    rows={3}
                    size="md"
                    {...form.getInputProps('description')}
                />

                <Select
                    data={[
                        {label: 'Easy', value: 'easy'},
                        {label: 'Medium', value: 'medium'},
                        {label: 'Hard', value: 'hard'},
                    ]}
                    description="How difficult is this recipe to make?"
                    label="Difficulty Level"
                    required
                    size="md"
                    withAsterisk
                    {...form.getInputProps('difficulty')}
                />

                <NumberInput
                    description="How many people does this recipe serve?"
                    label="Servings"
                    max={20}
                    min={1}
                    required
                    size="md"
                    withAsterisk
                    {...form.getInputProps('servings')}
                />

                <NumberInput
                    description="Time to prepare ingredients (in minutes)"
                    label="Prep Time"
                    max={300}
                    min={0}
                    required
                    size="md"
                    suffix=" minutes"
                    withAsterisk
                    {...form.getInputProps('prep_time_minutes')}
                />

                <NumberInput
                    description="Time to cook/bake (in minutes)"
                    label="Cook Time"
                    max={300}
                    min={0}
                    required
                    size="md"
                    suffix=" minutes"
                    withAsterisk
                    {...form.getInputProps('cook_time_minutes')}
                />

                <NumberInput
                    description="Total time from start to finish"
                    disabled
                    label="Total Time"
                    size="md"
                    suffix=" minutes"
                    {...form.getInputProps('duration')}
                />

                <Textarea
                    description="Step-by-step cooking instructions"
                    label="Instructions"
                    minRows={4}
                    placeholder="1. Preheat oven to 350°F...&#10;2. Mix dry ingredients...&#10;3. Add wet ingredients..."
                    required
                    size="md"
                    withAsterisk
                    {...form.getInputProps('instructions')}
                />
            </FormSection>

            <FixedBottom
                isSubmitting={form.submitting}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </form>
    );
};
