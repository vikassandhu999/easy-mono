import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Collapse, Loader, NumberInput, Text, Textarea, TextInput} from '@mantine/core';
import {IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import {useEffect, useImperativeHandle, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreateRecipe_zod, CreateRecipeForm, UpdateRecipe, useGetRecipe} from '@/services/recipes';
import {notifyError} from '@/utils/notification';

import {containsNutrition, getDefaultValues, populateRecipe} from './helper';
import ImagePicker from './ImagePicker';
import IngrdeintsField from './IngredientsField';
import InstructionsField from './InstructionsField';
import classes from './styles.module.css';

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
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    // Loading state
    if (recipeLoading && recipeId) {
        return (
            <div className={classes.loadingContainer}>
                <Loader size="md" />
                <Text className={classes.loadingText}>Loading recipe...</Text>
            </div>
        );
    }

    // Error state
    if (recipeError && recipeId) {
        return (
            <div className={classes.errorContainer}>
                <Text className={classes.errorTitle}>Failed to load recipe</Text>
                <Text className={classes.errorMessage}>Please try again or contact support.</Text>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmitForm)}>
            <div className={classes.formContainer}>
                {/* Recipe Image */}
                <ImagePicker form={form} />

                {/* Recipe Name */}
                <Controller
                    control={control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            error={errors.name?.message}
                            label={<span className={classes.fieldLabel}>Recipe Name</span>}
                            placeholder="Give your recipe a name"
                            size="md"
                        />
                    )}
                />

                {/* Description */}
                <Controller
                    control={control}
                    name="description"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            error={errors.description?.message}
                            label={<span className={classes.fieldLabel}>Description</span>}
                            minRows={3}
                            placeholder="Add notes, cooking tips, serving suggestions..."
                            size="md"
                            value={field.value || ''}
                        />
                    )}
                />

                {/* Instructions */}
                <InstructionsField form={form} />

                {/* Ingredients */}
                <IngrdeintsField form={form} />

                {/* Time & Servings */}
                <div className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <span className={classes.sectionTitle}>Time & Servings</span>
                    </div>
                    <div className={classes.metaGrid}>
                        <Controller
                            control={control}
                            name="prep_time_minutes"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    error={errors.prep_time_minutes?.message}
                                    hideControls
                                    label="Prep Time"
                                    min={1}
                                    placeholder="15"
                                    size="md"
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
                                    error={errors.prep_time_minutes?.message}
                                    hideControls
                                    label="Cook Time"
                                    min={1}
                                    placeholder="30"
                                    size="md"
                                    suffix=" min"
                                    value={field.value || undefined}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="servings"
                            render={({field}) => (
                                <NumberInput
                                    {...field}
                                    error={errors.servings?.message}
                                    hideControls
                                    label="Servings"
                                    min={1}
                                    placeholder="4"
                                    size="md"
                                    value={field.value || undefined}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Nutrition Information */}
                <div className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <span className={classes.sectionTitle}>Nutrition (per serving)</span>
                        <Button
                            color="gray"
                            onClick={toggleNutritionCollapse}
                            rightSection={
                                nutritionCollapse ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                            }
                            size="compact-xs"
                            variant="subtle"
                        >
                            {nutritionCollapse ? 'Hide' : 'Add'}
                        </Button>
                    </div>

                    <Collapse in={nutritionCollapse}>
                        <div className={classes.nutritionContent}>
                            <Controller
                                control={control}
                                name="total_calories"
                                render={({field}) => (
                                    <NumberInput
                                        className={classes.nutritionGridFull}
                                        error={errors.total_calories?.message}
                                        hideControls
                                        label="Calories"
                                        min={0}
                                        name={field.name}
                                        onBlur={field.onBlur}
                                        onChange={(value) => field.onChange(value === '' ? undefined : value)}
                                        placeholder="450"
                                        ref={field.ref}
                                        size="sm"
                                        suffix=" kcal"
                                        value={field.value ?? ''}
                                    />
                                )}
                            />
                            <div className={classes.nutritionGrid}>
                                <Controller
                                    control={control}
                                    name="total_protein"
                                    render={({field}) => (
                                        <NumberInput
                                            decimalScale={1}
                                            error={errors.total_protein?.message}
                                            hideControls
                                            label="Protein"
                                            min={0}
                                            name={field.name}
                                            onBlur={field.onBlur}
                                            onChange={(value) => field.onChange(value === '' ? undefined : value)}
                                            placeholder="25"
                                            ref={field.ref}
                                            size="sm"
                                            suffix=" g"
                                            value={field.value ?? ''}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="total_carbohydrates"
                                    render={({field}) => (
                                        <NumberInput
                                            decimalScale={1}
                                            error={errors.total_carbohydrates?.message}
                                            hideControls
                                            label="Carbs"
                                            min={0}
                                            name={field.name}
                                            onBlur={field.onBlur}
                                            onChange={(value) => field.onChange(value === '' ? undefined : value)}
                                            placeholder="35"
                                            ref={field.ref}
                                            size="sm"
                                            suffix=" g"
                                            value={field.value ?? ''}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="total_fats"
                                    render={({field}) => (
                                        <NumberInput
                                            decimalScale={1}
                                            error={errors.total_fats?.message}
                                            hideControls
                                            label="Fats"
                                            min={0}
                                            name={field.name}
                                            onBlur={field.onBlur}
                                            onChange={(value) => field.onChange(value === '' ? undefined : value)}
                                            placeholder="18"
                                            ref={field.ref}
                                            size="sm"
                                            suffix=" g"
                                            value={field.value ?? ''}
                                        />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="total_fiber"
                                    render={({field}) => (
                                        <NumberInput
                                            decimalScale={1}
                                            error={errors.total_fiber?.message}
                                            hideControls
                                            label="Fiber"
                                            min={0}
                                            name={field.name}
                                            onBlur={field.onBlur}
                                            onChange={(value) => field.onChange(value === '' ? undefined : value)}
                                            placeholder="5"
                                            ref={field.ref}
                                            size="sm"
                                            suffix=" g"
                                            value={field.value ?? ''}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </Collapse>
                </div>
            </div>
        </form>
    );
};

export default RecipeForm;
