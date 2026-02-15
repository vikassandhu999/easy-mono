import {Button, Card, FieldError, Input, Label, TextArea, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {AlertCircle, ChevronLeft} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Controller, type FieldErrors, type FieldPath, useFieldArray, useForm} from 'react-hook-form';
import {useBeforeUnload, useLocation, useNavigate, useParams} from 'react-router';

import type {RecipeFormIngredient, RecipeFormValues} from '@/pages/library/recipeFormTypes';

import {useListFoodsQuery} from '@/api/foods';
import {
  useCreateRecipeMutation,
  useDeleteRecipeMutation,
  useGetRecipeQuery,
  useUpdateRecipeMutation,
} from '@/api/recipes';
import {handleFormError} from '@/api/shared';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  mapRecipeToFormValues,
  parseOptionalRecipeNumber,
  RECIPE_FORM_SCHEMA,
  RECIPE_INITIAL_VALUES,
  RECIPE_NUMERIC_STEP,
} from '@/pages/library/recipeFormSchema';
import RecipeIngredientRow from '@/pages/library/RecipeIngredientRow';
import ServingSizeRows from '@/pages/library/ServingSizeRows';
import TagsInput from '@/pages/library/TagsInput';

const createEmptyIngredient = (): RecipeFormIngredient => ({
  amount: '',
  food_id: '',
  unit: '',
  weight_g: '',
});

const getFirstErrorPath = (formErrors: FieldErrors<RecipeFormValues>): FieldPath<RecipeFormValues> | null => {
  if (formErrors.name?.message) return 'name';
  if (formErrors.calories?.message) return 'calories';
  if (formErrors.protein?.message) return 'protein';
  if (formErrors.carbs?.message) return 'carbs';
  if (formErrors.fat?.message) return 'fat';
  if (formErrors.category?.message) return 'category';
  if (formErrors.source?.message) return 'source';
  if (formErrors.instructions?.message) return 'instructions';

  const ingredientErrors = formErrors.ingredients;
  if (!ingredientErrors) {
    return null;
  }

  type IngredientFieldError = {
    amount?: {message?: string};
    food_id?: {message?: string};
    unit?: {message?: string};
    weight_g?: {message?: string};
  };

  const indexedIngredientErrors = ingredientErrors as unknown as Record<string, IngredientFieldError>;

  for (const [rawIndex, error] of Object.entries(indexedIngredientErrors)) {
    const index = Number(rawIndex);
    if (!Number.isInteger(index)) {
      continue;
    }
    if (!error) {
      continue;
    }
    if (error.food_id?.message) return `ingredients.${index}.food_id`;
    if (error.amount?.message) return `ingredients.${index}.amount`;
    if (error.unit?.message) return `ingredients.${index}.unit`;
    if (error.weight_g?.message) return `ingredients.${index}.weight_g`;
  }

  return null;
};

export default function RecipeFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const isEditing = Boolean(id);
  const returnTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/library';
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [formError, setFormError] = useState<null | string>(null);

  const {
    data: recipeData,
    isError: isRecipeError,
    isLoading: isRecipeLoading,
    refetch: refetchRecipe,
  } = useGetRecipeQuery(id ?? '', {
    skip: !id,
  });

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
    setValue,
    watch,
  } = useForm<RecipeFormValues>({
    defaultValues: RECIPE_INITIAL_VALUES,
    resolver: zodResolver(RECIPE_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(RECIPE_INITIAL_VALUES);
      return;
    }
    if (recipeData?.data) {
      reset(mapRecipeToFormValues(recipeData.data));
    }
  }, [isEditing, recipeData?.data, reset]);

  const {fields, append, remove} = useFieldArray({
    control,
    name: 'ingredients',
  });

  const [createRecipe, {isLoading: isCreating}] = useCreateRecipeMutation();
  const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipeMutation();
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();
  const {data: foodsData} = useListFoodsQuery({limit: 100, offset: 0});
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const serviceSizeType = watch('service_size_type');

  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  const attemptNavigate = (target: string) => {
    if (hasPendingChanges) {
      const shouldLeave = window.confirm('You have unsaved changes. Leave without saving?');
      if (!shouldLeave) {
        return;
      }
    }
    navigate(target);
  };

  useBeforeUnload((event) => {
    if (!hasPendingChanges) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });

  const pageTitle = useMemo(() => {
    if (!isEditing) {
      return 'Create Recipe';
    }
    return recipeData?.data?.name ? `Edit ${recipeData.data.name}` : 'Edit Recipe';
  }, [isEditing, recipeData?.data?.name]);

  const focusErrorPath = (path: FieldPath<RecipeFormValues>) => {
    requestAnimationFrame(() => {
      setFocus(path);
      const match = /^ingredients\.(\d+)\./.exec(path);
      if (match?.[1]) {
        const index = Number(match[1]);
        rowRefs.current[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);

      const calories = parseOptionalRecipeNumber(values.calories);
      const protein = parseOptionalRecipeNumber(values.protein);
      const carbs = parseOptionalRecipeNumber(values.carbs);
      const fat = parseOptionalRecipeNumber(values.fat);

      const recipeIngredients = values.ingredients
        .filter((ingredient) => ingredient.food_id)
        .map((ingredient) => ({
          amount: parseOptionalRecipeNumber(ingredient.amount),
          food_id: ingredient.food_id,
          unit: ingredient.unit.trim() || undefined,
          weight_g: parseOptionalRecipeNumber(ingredient.weight_g),
        }));

      const servingSizes = values.serving_sizes
        .map((row) => ({
          amount: parseOptionalRecipeNumber(row.amount) ?? null,
          unit: row.unit.trim(),
          weight_g: parseOptionalRecipeNumber(row.weight_g) ?? null,
        }))
        .filter((row) => row.unit || row.weight_g !== null || row.amount !== null)
        .map((row) => ({
          amount: row.amount,
          unit: row.unit || 'serving',
          weight_g: row.weight_g,
        }));

      const macros =
        calories !== undefined || protein !== undefined || carbs !== undefined || fat !== undefined
          ? {
              calories: calories ?? 0,
              carbs: carbs ?? 0,
              fat: fat ?? 0,
              protein: protein ?? 0,
            }
          : undefined;

      const payload = {
        category: values.category.trim() || undefined,
        cooked_weight_g:
          values.service_size_type === 'weight_based' ? parseOptionalRecipeNumber(values.cooked_weight_g) : undefined,
        image_url: values.image_url.trim() || undefined,
        instructions: values.instructions.trim() || undefined,
        macros,
        name: values.name.trim(),
        recipe_ingredients: recipeIngredients.length > 0 ? recipeIngredients : undefined,
        service_size_type: values.service_size_type,
        serving_sizes: servingSizes.length > 0 ? servingSizes : undefined,
        source: values.source.trim() || undefined,
        tags: values.tags.length > 0 ? values.tags : undefined,
      };

      try {
        if (id) {
          await updateRecipe({body: payload, id}).unwrap();
          toast.success(`Recipe "${values.name.trim()}" updated successfully.`);
        } else {
          await createRecipe(payload).unwrap();
          toast.success(`Recipe "${values.name.trim()}" created successfully.`);
        }
        reset(values);
        navigate(returnTo);
      } catch (err) {
        const result = handleFormError(
          err,
          id ? 'Unable to update recipe. Please try again.' : 'Unable to create recipe. Please try again.',
        );
        if (result.fieldErrors) {
          const namedFieldMap: Record<string, FieldPath<RecipeFormValues>> = {
            calories: 'calories',
            carbs: 'carbs',
            category: 'category',
            cooked_weight_g: 'cooked_weight_g',
            fat: 'fat',
            image_url: 'image_url',
            instructions: 'instructions',
            name: 'name',
            protein: 'protein',
            service_size_type: 'service_size_type',
            source: 'source',
            tags: 'tags',
          };

          Object.entries(result.fieldErrors).forEach(([key, messages]) => {
            const path = namedFieldMap[key];
            if (!path || messages.length === 0) {
              return;
            }
            setError(path, {type: 'server', message: messages[0]});
          });
        }
        setFormError(result.formError);
        if (!result.fieldErrors) {
          toast.danger(result.formError);
        }
      }
    },
    (invalidValues) => {
      setFormError('Please fix the highlighted fields before saving.');
      const firstErrorPath = getFirstErrorPath(invalidValues);
      if (firstErrorPath) {
        focusErrorPath(firstErrorPath);
      }
    },
  );

  const handleDelete = async () => {
    if (!id || !recipeData?.data) {
      return;
    }
    try {
      await deleteRecipe(id).unwrap();
      toast.success(`Recipe "${recipeData.data.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete recipe. Please try again.');
      toast.danger(result.formError);
    }
  };

  if (isEditing && isRecipeLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading recipe details...</p>
      </Card>
    );
  }

  if (isEditing && isRecipeError) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-foreground">Could not load recipe</p>
          <p className="text-sm text-muted">Please retry. If this continues, check API connectivity.</p>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchRecipe()}
              size="md"
              variant="outline"
            >
              Retry
            </Button>
            <Button
              className="min-h-11"
              onPress={() => attemptNavigate(returnTo)}
              size="md"
              variant="ghost"
            >
              Back
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          className="min-h-11 w-fit gap-2 px-2"
          onPress={() => attemptNavigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to library</span>
        </Button>
        <p className="text-sm text-muted">Library</p>
        <h1 className="text-2xl font-semibold md:text-3xl">{pageTitle}</h1>
        <p className="max-w-2xl text-sm text-muted">
          Build complete recipes with macros, instructions, and ingredients.
        </p>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={onSubmit}
      >
        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Basics</p>

          <TextField isInvalid={Boolean(errors.name?.message)}>
            <Label className="text-sm font-medium text-foreground">Recipe name</Label>
            <Input
              placeholder="e.g. High Protein Pancakes"
              variant="secondary"
              {...register('name')}
            />
            {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
          </TextField>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField isInvalid={Boolean(errors.category?.message)}>
              <Label className="text-sm font-medium text-foreground">Category</Label>
              <Input
                placeholder="e.g. Breakfast"
                variant="secondary"
                {...register('category')}
              />
              {errors.category?.message ? <FieldError>{errors.category.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.source?.message)}>
              <Label className="text-sm font-medium text-foreground">Source</Label>
              <Input
                placeholder="e.g. Internal"
                variant="secondary"
                {...register('source')}
              />
              {errors.source?.message ? <FieldError>{errors.source.message}</FieldError> : null}
            </TextField>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Macros</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField isInvalid={Boolean(errors.calories?.message)}>
              <Label className="text-sm font-medium text-foreground">Calories</Label>
              <Input
                placeholder="e.g. 450"
                step={RECIPE_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register('calories')}
              />
              {errors.calories?.message ? <FieldError>{errors.calories.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.protein?.message)}>
              <Label className="text-sm font-medium text-foreground">Protein (g)</Label>
              <Input
                placeholder="e.g. 30"
                step={RECIPE_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register('protein')}
              />
              {errors.protein?.message ? <FieldError>{errors.protein.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.carbs?.message)}>
              <Label className="text-sm font-medium text-foreground">Carbs (g)</Label>
              <Input
                placeholder="e.g. 40"
                step={RECIPE_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register('carbs')}
              />
              {errors.carbs?.message ? <FieldError>{errors.carbs.message}</FieldError> : null}
            </TextField>

            <TextField isInvalid={Boolean(errors.fat?.message)}>
              <Label className="text-sm font-medium text-foreground">Fat (g)</Label>
              <Input
                placeholder="e.g. 12"
                step={RECIPE_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register('fat')}
              />
              {errors.fat?.message ? <FieldError>{errors.fat.message}</FieldError> : null}
            </TextField>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <Controller
            control={control}
            name="tags"
            render={({field}) => (
              <TagsInput
                label="Tags"
                onChange={(nextTags) => field.onChange(nextTags)}
                placeholder="Add tags (press Enter or comma)"
                value={field.value}
              />
            )}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <TextField isInvalid={Boolean(errors.image_url?.message)}>
            <Label className="text-sm font-medium text-foreground">Image URL</Label>
            <Input
              placeholder="https://example.com/recipe.jpg"
              variant="secondary"
              {...register('image_url')}
            />
            {errors.image_url?.message ? <FieldError>{errors.image_url.message}</FieldError> : null}
          </TextField>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Serving configuration</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-11"
              onPress={() => setValue('service_size_type', 'serving_based')}
              type="button"
              variant={serviceSizeType === 'serving_based' ? 'secondary' : 'outline'}
            >
              Serving based
            </Button>
            <Button
              className="min-h-11"
              onPress={() => setValue('service_size_type', 'weight_based')}
              type="button"
              variant={serviceSizeType === 'weight_based' ? 'secondary' : 'outline'}
            >
              Weight based
            </Button>
          </div>
          {serviceSizeType === 'weight_based' ? (
            <TextField isInvalid={Boolean(errors.cooked_weight_g?.message)}>
              <Label className="text-sm font-medium text-foreground">Cooked weight (g)</Label>
              <Input
                placeholder="e.g. 800"
                step={RECIPE_NUMERIC_STEP}
                type="number"
                variant="secondary"
                {...register('cooked_weight_g')}
              />
              {errors.cooked_weight_g?.message ? <FieldError>{errors.cooked_weight_g.message}</FieldError> : null}
            </TextField>
          ) : null}
        </section>

        <ServingSizeRows
          control={control}
          errors={errors}
          register={register}
          title="Serving sizes"
        />

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Instructions</p>

          <TextField isInvalid={Boolean(errors.instructions?.message)}>
            <Label className="text-sm font-medium text-foreground">Instructions</Label>
            <TextArea
              placeholder="Optional prep instructions"
              variant="secondary"
              {...register('instructions')}
            />
            {errors.instructions?.message ? <FieldError>{errors.instructions.message}</FieldError> : null}
          </TextField>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Ingredients</p>

          <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
            <div>
              <p className="text-sm font-medium text-foreground">Ingredients</p>
              <p className="text-xs text-muted">
                {fields.length} ingredient
                {fields.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              className="min-h-11 gap-1 px-3"
              onPress={() => append(createEmptyIngredient())}
              size="sm"
              type="button"
              variant="outline"
            >
              <span className="text-lg leading-none">+</span>
              <span>Add ingredient</span>
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium text-foreground">No ingredients yet</p>
                <p className="text-xs text-muted">Add your first ingredient to build this recipe.</p>
                <Button
                  className="min-h-11 gap-1 px-3"
                  onPress={() => append(createEmptyIngredient())}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <span className="text-lg leading-none">+</span>
                  <span>Add ingredient</span>
                </Button>
              </div>
            </div>
          ) : null}

          {fields.map((field, index) => (
            <RecipeIngredientRow
              foods={foodsData?.data ?? []}
              form={{control, errors, register}}
              initialFood={recipeData?.data?.recipe_ingredients?.[index]?.food}
              key={field.id}
              numericStep={RECIPE_NUMERIC_STEP}
              row={{
                id: field.id,
                index,
                onRemove: () => remove(index),
                ref: (node) => {
                  rowRefs.current[index] = node;
                },
                title: `Ingredient ${index + 1}`,
              }}
            />
          ))}
        </section>

        {formError ? (
          <div className="flex items-start gap-2 rounded-lg border border-separator bg-surface-secondary p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <p className="text-sm text-foreground">{formError}</p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-separator pt-4 sm:flex-row sm:justify-end">
          {isEditing ? (
            <Button
              className="min-h-11 sm:mr-auto"
              onPress={() => setIsDeleteOpen(true)}
              size="md"
              type="button"
              variant="danger"
            >
              Delete recipe
            </Button>
          ) : null}
          <Button
            className="min-h-11"
            onPress={() => attemptNavigate(returnTo)}
            size="md"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isSubmitting}
            size="md"
            type="submit"
            variant="primary"
          >
            {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save recipe' : 'Create recipe'}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        confirmLabel="Delete recipe"
        description={`Are you sure you want to delete ${recipeData?.data?.name ?? 'this recipe'}? This cannot be undone.`}
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete recipe"
      />
    </div>
  );
}
