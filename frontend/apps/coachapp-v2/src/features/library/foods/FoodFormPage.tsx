import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';

import type {FoodFormValues} from '@/features/library/foods/foodFormTypes';

import {
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useGetFoodQuery,
  useUpdateFoodMutation,
} from '@/entities/foods/api/foods';
import FoodFormFields from '@/features/library/foods/FoodFormFields';
import {
  buildFoodPayload,
  FOOD_FORM_SCHEMA,
  FOOD_INITIAL_VALUES,
  mapFoodToFormValues,
} from '@/features/library/foods/foodFormSchema';
import {applyServerErrors, getPageTitle, useUnsavedChangesWarning} from '@/features/library/formPageHelpers';
import {getReturnTo} from '@/features/library/libraryFormShared';
import {handleFormError} from '@/shared/api/shared';
import FormPageShell from '@/shared/ui/forms/FormPageShell';

const FIELD_MAP: Record<string, FieldPath<FoodFormValues>> = {
  calories: 'calories',
  carbs: 'carbs',
  category: 'category',
  fat: 'fat',
  image_url: 'image_url',
  name: 'name',
  notes: 'notes',
  protein: 'protein',
  source: 'source',
  tags: 'tags',
};

export default function FoodFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams({strict: false});
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const returnTo = getReturnTo(location.state, '/library');

  const {
    data: foodData,
    isError: isFoodError,
    isLoading: isFoodLoading,
    refetch: refetchFood,
  } = useGetFoodQuery(id ?? '', {skip: !id});

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<FoodFormValues>({
    defaultValues: FOOD_INITIAL_VALUES,
    resolver: zodResolver(FOOD_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(FOOD_INITIAL_VALUES);
      return;
    }
    if (foodData?.data) {
      reset(mapFoodToFormValues(foodData.data));
    }
  }, [foodData?.data, isEditing, reset]);

  const [createFood, {isLoading: isCreating}] = useCreateFoodMutation();
  const [deleteFood, {isLoading: isDeleting}] = useDeleteFoodMutation();
  const [updateFood, {isLoading: isUpdating}] = useUpdateFoodMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  useUnsavedChangesWarning(hasPendingChanges);
  const onBack = () => navigate({to: returnTo});
  const pageTitle = getPageTitle(isEditing, 'Food', foodData?.data?.name);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = buildFoodPayload(values);
    try {
      if (id) {
        await updateFood({body: payload, id}).unwrap();
        toast.success(`Food "${values.name.trim()}" updated successfully.`);
      } else {
        await createFood(payload).unwrap();
        toast.success(`Food "${values.name.trim()}" created successfully.`);
      }
      reset(values);
      navigate({to: returnTo});
    } catch (err) {
      const result = handleFormError(
        err,
        id ? 'Unable to update food. Please try again.' : 'Unable to create food. Please try again.',
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
    if (!id || !foodData?.data) return;
    try {
      await deleteFood(id).unwrap();
      toast.success(`Food "${foodData.data.name}" deleted successfully.`);
      navigate({to: returnTo});
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete food. Please try again.');
      toast.danger(result.formError);
    }
  };

  return (
    <FormPageShell
      actions={{
        deleteLabel: 'Delete food',
        entityName: foodData?.data?.name,
        isDeleting,
        isSubmitting,
        onBack,
        onDelete: isEditing ? handleDelete : undefined,
        onSubmit,
        submitLabel: isEditing ? 'Save food' : 'Create food',
      }}
      formError={formError}
      header={{
        breadcrumb: 'Library',
        description: 'Add or update a shared food with optional macros and metadata.',
        title: pageTitle,
      }}
      state={{
        hasPendingChanges,
        isError: isEditing && isFoodError,
        isLoading: isEditing && isFoodLoading,
        onRetry: refetchFood,
      }}
    >
      <FoodFormFields
        control={control}
        errors={errors}
        register={register}
      />
    </FormPageShell>
  );
}
