import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';
import {useLocation, useNavigate, useParams} from 'react-router';

import type {RecipeFormValues} from '@/pages/library/recipeFormTypes';

import {useListFoodsQuery} from '@/api/foods';
import {
  useCreateRecipeMutation,
  useDeleteRecipeMutation,
  useGetRecipeQuery,
  useUpdateRecipeMutation,
} from '@/api/recipes';
import {handleFormError} from '@/api/shared';
import FormPageShell from '@/components/FormPageShell';
import RecipeFormFields from '@/components/RecipeFormFields';
import {applyServerErrors, getPageTitle, useUnsavedChangesWarning} from '@/pages/library/formPageHelpers';
import {getReturnTo} from '@/pages/library/libraryFormShared';
import {
  buildRecipePayload,
  mapRecipeToFormValues,
  RECIPE_FORM_SCHEMA,
  RECIPE_INITIAL_VALUES,
} from '@/pages/library/recipeFormSchema';

const FIELD_MAP: Record<string, FieldPath<RecipeFormValues>> = {
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

export default function RecipeFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const returnTo = getReturnTo(location, '/library');

  const {
    data: recipeData,
    isError: isRecipeError,
    isLoading: isRecipeLoading,
    refetch: refetchRecipe,
  } = useGetRecipeQuery(id ?? '', {skip: !id});

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
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

  const {data: foodsData} = useListFoodsQuery({limit: 100, offset: 0});
  const [createRecipe, {isLoading: isCreating}] = useCreateRecipeMutation();
  const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipeMutation();
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  useUnsavedChangesWarning(hasPendingChanges);
  const onBack = () => navigate(returnTo);
  const pageTitle = getPageTitle(isEditing, 'Recipe', recipeData?.data?.name);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = buildRecipePayload(values);
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
        applyServerErrors(result.fieldErrors, setError, FIELD_MAP);
      }
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const handleDelete = async () => {
    if (!id || !recipeData?.data) return;
    try {
      await deleteRecipe(id).unwrap();
      toast.success(`Recipe "${recipeData.data.name}" deleted successfully.`);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete recipe. Please try again.');
      toast.danger(result.formError);
    }
  };

  return (
    <FormPageShell
      actions={{
        deleteLabel: 'Delete recipe',
        entityName: recipeData?.data?.name,
        isDeleting,
        isSubmitting,
        onBack,
        onDelete: isEditing ? handleDelete : undefined,
        onSubmit,
        submitLabel: isEditing ? 'Save recipe' : 'Create recipe',
      }}
      formError={formError}
      header={{
        breadcrumb: 'Library',
        description: 'Build complete recipes with macros, instructions, and ingredients.',
        title: pageTitle,
      }}
      state={{
        hasPendingChanges,
        isError: isEditing && isRecipeError,
        isLoading: isEditing && isRecipeLoading,
        onRetry: refetchRecipe,
      }}
    >
      <RecipeFormFields
        control={control}
        errors={errors}
        foods={foodsData?.data ?? []}
        initialIngredients={recipeData?.data?.recipe_ingredients}
        register={register}
        setValue={setValue}
      />
    </FormPageShell>
  );
}
