import {Grid, GridCol, Image, NumberInput, Stack, Textarea, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import React from 'react';

import {CreateContentProps} from '@/api/contents.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {useCreateContentMutation} from '@/store/services/contentsApi';

import RecipeDemoImage from '../../../public/recipes/1.png';
import {ChipSelect} from '../ChipSelect';
import {
    COOKING_METHODS,
    DEFAULT_FORM_VALUES,
    DIET_TYPES,
    DIFFICULTY_OPTIONS,
    MEAL_TYPES,
    VALIDATION_CONSTRAINTS,
} from './constants';
import {RecipeSegmentedSection} from './RecipeTabbedSection';

interface RecipeCreateFormProps {
    onError?: (error: any) => void;
    onSuccess?: (recipe: any) => void;
    submitText: string;
}

interface RecipeFormValues {
    // Nutrition fields
    calories: number;
    carbs_g: number;
    cook_time_minutes: number;
    cooking_methods: string[];
    description: string;
    diet_types: string[];
    difficulty: string;
    duration: number;
    equipment_needed: string[];
    fats_g: number;
    fiber_g: number;
    // Ingredients will be managed by the tabbed section
    ingredients?: Array<{
        amount: string;
        name: string;
        unit: string;
    }>;
    instructions: string;
    meal_prep_friendly: boolean;
    meal_types: string[];
    name: string;
    prep_time_minutes: number;
    protein_g: number;
    servings: number;
    storage_instructions: string[];
    sugar_g: number;
}

export const RecipeCreateForm: React.FC<RecipeCreateFormProps> = ({onSuccess, onError, submitText}) => {
    const [createContent] = useCreateContentMutation();
    const form = useForm<RecipeFormValues>({
        initialValues: DEFAULT_FORM_VALUES,
        validate: {
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Recipe name is required';
                }
                if (value.length < VALIDATION_CONSTRAINTS.name.minLength) {
                    return `Recipe name must be at least ${VALIDATION_CONSTRAINTS.name.minLength} characters`;
                }
                if (value.length > VALIDATION_CONSTRAINTS.name.maxLength) {
                    return `Recipe name must be less than ${VALIDATION_CONSTRAINTS.name.maxLength} characters`;
                }
                return null;
            },
            description: (value) => {
                if (value && value.length > VALIDATION_CONSTRAINTS.description.maxLength) {
                    return `Description must be less than ${VALIDATION_CONSTRAINTS.description.maxLength} characters`;
                }
                return null;
            },
            instructions: () => {
                // Instructions are optional if managed through tabbed section
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
                if (value > VALIDATION_CONSTRAINTS.servings.max) {
                    return `Servings must be ${VALIDATION_CONSTRAINTS.servings.max} or less`;
                }
                return null;
            },
            prep_time_minutes: (value) => {
                if (!value || value < VALIDATION_CONSTRAINTS.time.min) {
                    return `Prep time must be ${VALIDATION_CONSTRAINTS.time.min} or greater`;
                }
                if (value > VALIDATION_CONSTRAINTS.time.max) {
                    return `Prep time must be ${VALIDATION_CONSTRAINTS.time.max} minutes or less`;
                }
                return null;
            },
            cook_time_minutes: (value) => {
                if (!value || value < VALIDATION_CONSTRAINTS.time.min) {
                    return `Cook time must be ${VALIDATION_CONSTRAINTS.time.min} or greater`;
                }
                if (value > VALIDATION_CONSTRAINTS.time.max) {
                    return `Cook time must be ${VALIDATION_CONSTRAINTS.time.max} minutes or less`;
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

        try {
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
                    cooking_methods: values.cooking_methods,
                    diet_types: values.diet_types,
                    meal_types: values.meal_types,
                    equipment_needed: values.equipment_needed,
                    storage_instructions: values.storage_instructions,
                    meal_prep_friendly: values.meal_prep_friendly,
                    ingredients: values.ingredients || [],
                    nutrition_per_serving: {
                        calories: values.calories,
                        serving_size: '1 serving',
                        macros: {
                            protein_g: values.protein_g,
                            carbs_g: values.carbs_g,
                            fats_g: values.fats_g,
                            fiber_g: values.fiber_g,
                            sugar_g: values.sugar_g,
                        },
                    },
                    derived_metrics: [],
                    trackable_metrics: [],
                },
            };

            const result = await createContent(recipeData).unwrap();

            notifications.show({
                color: 'green',
                message: 'Recipe created successfully!',
                position: 'top-center',
                title: 'Success',
            });

            onSuccess?.(result);
            form.reset();
        } catch (error) {
            notifications.show({
                color: 'red',
                message: 'Failed to create recipe. Please try again.',
                position: 'top-center',
                title: 'Error',
            });
            onError?.(error);
        }
    };

    // Update duration when prep or cook time changes
    React.useEffect(() => {
        const totalTime = form.values.prep_time_minutes + form.values.cook_time_minutes;
        if (totalTime !== form.values.duration) {
            form.setFieldValue('duration', totalTime);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.prep_time_minutes, form.values.cook_time_minutes]); // Only depend on the specific values to prevent infinite loop

    return (
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <Stack gap="lg">
                <Grid
                    align="center"
                    gutter="lg"
                >
                    {/* Recipe Image */}
                    <GridCol span={{xs: 12, sm: 12, md: 4}}>
                        <Image
                            h={200}
                            radius="md"
                            src={RecipeDemoImage}
                            w={200}
                        />
                    </GridCol>
                    <GridCol span={{xs: 12, sm: 12, md: 8}}>
                        {/* Recipe Name */}
                        <TextInput
                            description="Give your recipe a catchy name"
                            label="Recipe Name"
                            placeholder="e.g., Grandma's Famous Chocolate Chip Cookies"
                            required
                            size="md"
                            withAsterisk
                            {...form.getInputProps('name')}
                        />
                        {/* Description */}
                        <Textarea
                            label="Description"
                            placeholder="Describe what makes this recipe special..."
                            rows={3}
                            size="md"
                            {...form.getInputProps('description')}
                        />
                    </GridCol>
                </Grid>

                <Grid
                    align="center"
                    gutter="lg"
                >
                    <GridCol span={{xs: 12, sm: 12, md: 6}}>
                        {/* Difficulty Level */}
                        <ChipSelect
                            data={DIFFICULTY_OPTIONS}
                            description="How difficult is this recipe to make?"
                            label="Difficulty Level"
                            required
                            size="md"
                            variant="light"
                            withAsterisk
                            {...form.getInputProps('difficulty')}
                        />
                    </GridCol>
                    <GridCol span={{xs: 12, sm: 12, md: 6}}>
                        {/* Servings */}
                        <NumberInput
                            description="How many people does this recipe serve?"
                            label="Servings"
                            max={VALIDATION_CONSTRAINTS.servings.max}
                            min={VALIDATION_CONSTRAINTS.servings.min}
                            required
                            size="md"
                            withAsterisk
                            {...form.getInputProps('servings')}
                        />
                    </GridCol>
                </Grid>

                <Grid>
                    <GridCol span={{xs: 12, sm: 12, md: 4}}>
                        <NumberInput
                            description="Time to prepare ingredients (in minutes)"
                            flex={1}
                            label="Prep Time"
                            max={VALIDATION_CONSTRAINTS.time.max}
                            min={VALIDATION_CONSTRAINTS.time.min}
                            required
                            size="md"
                            suffix=" minutes"
                            withAsterisk
                            {...form.getInputProps('prep_time_minutes')}
                        />
                    </GridCol>
                    <GridCol span={{xs: 12, sm: 12, md: 4}}>
                        <NumberInput
                            description="Time to cook/bake (in minutes)"
                            flex={1}
                            label="Cook Time"
                            max={VALIDATION_CONSTRAINTS.time.max}
                            min={VALIDATION_CONSTRAINTS.time.min}
                            required
                            size="md"
                            suffix=" minutes"
                            withAsterisk
                            {...form.getInputProps('cook_time_minutes')}
                        />
                    </GridCol>

                    <GridCol span={{xs: 12, sm: 12, md: 4}}>
                        <NumberInput
                            description="Total time from start to finish"
                            disabled
                            flex={1}
                            label="Total Time"
                            size="md"
                            suffix=" minutes"
                            {...form.getInputProps('duration')}
                        />
                    </GridCol>
                </Grid>

                <ChipSelect
                    data={MEAL_TYPES}
                    description="What type of meal is this recipe for?"
                    label="Meal Types"
                    multiple
                    size="md"
                    variant="light"
                    {...form.getInputProps('meal_types')}
                />

                <ChipSelect
                    data={COOKING_METHODS}
                    description="How is this recipe prepared?"
                    label="Cooking Methods"
                    multiple
                    size="md"
                    variant="light"
                    {...form.getInputProps('cooking_methods')}
                />

                <ChipSelect
                    data={DIET_TYPES}
                    description="What dietary restrictions or preferences does this recipe meet?"
                    label="Diet Types"
                    multiple
                    size="md"
                    variant="light"
                    {...form.getInputProps('diet_types')}
                />

                <RecipeSegmentedSection form={form} />
            </Stack>

            <FixedBottom
                isSubmitting={false}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </form>
    );
};
