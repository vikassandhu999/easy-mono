import {zodResolver} from '@hookform/resolvers/zod';
import {
    Button,
    Collapse,
    Group,
    Loader,
    NumberInput,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import {IconMinus, IconPlus} from '@tabler/icons-react';
import {useEffect, useImperativeHandle, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreateRecipe_zod, CreateRecipeForm, UpdateRecipe, useGetRecipe} from '@/services/recipes';
import APIErrorParser from '@/utils/error_parser';
import {notifyError} from '@/utils/notification';

import {containsNutrition, getDefaultValues, populateRecipe} from './helper';
import IngrdeintsField from './IngredientsField';
import InstructionsField from './InstructionsField';

// Discriminated union for form handle based on mode
export type RecipeFormHandle<TMode extends 'create' | 'update' = 'create'> = TMode extends 'update'
    ? {
          getValues: () => CreateRecipeForm;
          reset: () => void;
          submit: () => Promise<void>;
      }
    : {
          getValues: () => CreateRecipeForm;
          reset: () => void;
          submit: () => Promise<void>;
      };

// Base props shared by both modes
interface RecipeFormPropsBase {
    initialValues?: Partial<CreateRecipeForm>;
}

// Discriminated union for props based on whether recipeId exists
export type RecipeFormProps =
    | (RecipeFormPropsBase & {
          recipeId: string;
          onSubmit?: (values: UpdateRecipe) => Promise<void> | void;
          ref?: React.Ref<RecipeFormHandle<'update'>>;
      })
    | (RecipeFormPropsBase & {
          recipeId?: never;
          onSubmit?: (values: CreateRecipeForm) => Promise<void> | void;
          ref?: React.Ref<RecipeFormHandle<'create'>>;
      });

const RecipeForm = ({initialValues, onSubmit, ref, recipeId}: RecipeFormProps) => {
    const [nutritionCollapse, setNutritionCollapse] = useState(false);

    const toggleNutritionCollapse = () => setNutritionCollapse(!nutritionCollapse);

    // Fetch recipe if recipeId is provided
    const {
        data: recipe,
        isLoading: recipeLoading,
        error: recipeError,
    } = useGetRecipe(recipeId ?? '', {
        skip: !recipeId,
    });

    const form = useForm<CreateRecipeForm>({
        defaultValues: {
            ...getDefaultValues,
            ...initialValues,
        },
        resolver: zodResolver(CreateRecipe_zod),
    });

    const {
        control,
        handleSubmit,
        reset,
        getValues,
        formState: {errors},
    } = form;

    // Populate form when recipe data is loaded
    useEffect(() => {
        if (recipe && recipeId) {
            reset(populateRecipe(recipe));

            if (containsNutrition(recipe)) {
                setNutritionCollapse(true);
            }
        }
    }, [recipe, recipeId, reset]);

    useImperativeHandle(ref, () => ({
        submit: async () => {
            await handleSubmit(onSubmitForm)();
        },
        reset: () => {
            reset();
        },
        getValues: () => {
            return getValues();
        },
    }));

    const onSubmitForm = async (values: CreateRecipeForm) => {
        try {
            if (onSubmit) {
                // If recipeId exists, we're in update mode and need to include the id
                if (recipeId) {
                    await (onSubmit as (values: UpdateRecipe) => Promise<void> | void)({
                        ...values,
                        id: recipeId,
                    });
                } else {
                    await (onSubmit as (values: CreateRecipeForm) => Promise<void> | void)(values);
                }
            }
        } catch (error) {
            const err_msg = new APIErrorParser(error).humanize();
            notifyError(err_msg);
        }
    };

    // Loading state
    if (recipeLoading && recipeId) {
        return (
            <Stack
                align="center"
                gap="md"
                p="xl"
            >
                <Loader size="lg" />
                <Text c="dimmed">Loading recipe...</Text>
            </Stack>
        );
    }

    // Error state
    if (recipeError && recipeId) {
        return (
            <Stack
                align="center"
                gap="md"
                p="xl"
            >
                <Text
                    c="red"
                    size="lg"
                >
                    Failed to load recipe
                </Text>
                <Text
                    c="dimmed"
                    size="sm"
                >
                    Please try again or contact support.
                </Text>
            </Stack>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmitForm)}>
            <Stack gap="xl">
                <Controller
                    control={control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            error={errors.name?.message}
                            label={
                                <Title
                                    fw="bold"
                                    order={5}
                                >
                                    Title
                                </Title>
                            }
                            placeholder="Give your recipe a name"
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="description"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            error={errors.description?.message}
                            label={
                                <Title
                                    fw="bold"
                                    order={5}
                                >
                                    Description
                                </Title>
                            }
                            minRows={5}
                            placeholder="Introduce you recipe, add notes, cooking tips, serving suggestions, etc."
                            rows={4}
                            value={field.value || ''}
                        />
                    )}
                />

                {/* Instructions */}
                <InstructionsField form={form} />
                {/* Ingredients  */}
                <IngrdeintsField form={form} />

                {/* Prep time , Cook Time, Servings */}

                <SimpleGrid cols={2}>
                    <Controller
                        control={control}
                        name="prep_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                description="How long does it take to prepare this recipe?"
                                error={errors.prep_time_minutes?.message}
                                hideControls
                                label={
                                    <Title
                                        fw="bold"
                                        order={5}
                                    >
                                        Prep Time
                                    </Title>
                                }
                                min={1}
                                placeholder="25"
                                suffix=" min"
                                value={field.value || undefined}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="cook_time_minutes"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                description="How long does it take to cook this recipe?"
                                error={errors.prep_time_minutes?.message}
                                hideControls
                                label={
                                    <Title
                                        fw="bold"
                                        order={5}
                                    >
                                        Cook Time
                                    </Title>
                                }
                                min={1}
                                placeholder="25"
                                suffix=" min"
                                value={field.value || undefined}
                            />
                        )}
                    />
                </SimpleGrid>
                <Group
                    grow
                    justify="start"
                    wrap="nowrap"
                >
                    <Controller
                        control={control}
                        name="servings"
                        render={({field}) => (
                            <NumberInput
                                {...field}
                                description="How many portions does this recipe make?"
                                error={errors.servings?.message}
                                hideControls
                                label={
                                    <Title
                                        fw="bold"
                                        order={5}
                                    >
                                        Servings
                                    </Title>
                                }
                                min={1}
                                placeholder="2"
                                value={field.value || undefined}
                            />
                        )}
                    />
                </Group>
                {/* Ingredients Section */}
                <Stack gap="md">
                    <Group>
                        <Title
                            fw="bold"
                            order={6}
                        >
                            Nutrition Information (per serving)
                        </Title>

                        <Button
                            color="cyan"
                            onClick={toggleNutritionCollapse}
                            radius="lg"
                            rightSection={!nutritionCollapse ? <IconPlus size={14} /> : <IconMinus size={14} />}
                            size="compact-sm"
                            variant="light"
                        >
                            Add Info
                        </Button>
                    </Group>

                    <Collapse in={nutritionCollapse}>
                        <Stack gap="md">
                            <Controller
                                control={control}
                                name="total_calories"
                                render={({field}) => (
                                    <NumberInput
                                        {...field}
                                        description="Total calories per serving"
                                        error={errors.total_calories?.message}
                                        hideControls
                                        label="Calories"
                                        min={0}
                                        placeholder="450"
                                        suffix=" kcal"
                                        value={field.value || undefined}
                                    />
                                )}
                            />

                            <Group
                                grow
                                wrap="nowrap"
                            >
                                <Controller
                                    control={control}
                                    name="total_protein"
                                    render={({field}) => (
                                        <NumberInput
                                            {...field}
                                            decimalScale={1}
                                            error={errors.total_protein?.message}
                                            hideControls
                                            label="Protein"
                                            min={0}
                                            placeholder="42"
                                            suffix=" g"
                                            value={field.value || undefined}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="total_carbohydrates"
                                    render={({field}) => (
                                        <NumberInput
                                            {...field}
                                            decimalScale={1}
                                            error={errors.total_carbohydrates?.message}
                                            hideControls
                                            label="Carbs"
                                            min={0}
                                            placeholder="8"
                                            suffix=" g"
                                            value={field.value || undefined}
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
                                    name="total_fats"
                                    render={({field}) => (
                                        <NumberInput
                                            {...field}
                                            decimalScale={1}
                                            error={errors.total_fats?.message}
                                            hideControls
                                            label="Fats"
                                            min={0}
                                            placeholder="28"
                                            suffix=" g"
                                            value={field.value || undefined}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="total_fiber"
                                    render={({field}) => (
                                        <NumberInput
                                            {...field}
                                            decimalScale={1}
                                            error={errors.total_fiber?.message}
                                            hideControls
                                            label="Fiber"
                                            min={0}
                                            placeholder="2"
                                            suffix=" g"
                                            value={field.value || undefined}
                                        />
                                    )}
                                />
                            </Group>
                        </Stack>
                    </Collapse>
                </Stack>
            </Stack>
        </form>
    );
};

export default RecipeForm;
