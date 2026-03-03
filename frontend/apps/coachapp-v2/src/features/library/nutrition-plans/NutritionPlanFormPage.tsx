import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';
import {useLocation, useNavigate, useParams} from 'react-router';

import type {NutritionPlanFormValues} from '@/features/library/nutrition-plans/nutritionPlanFormTypes';

import {
  useCreateNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useGetNutritionPlanQuery,
  useUpdateNutritionPlanMutation,
} from '@/entities/nutritionPlans/api/nutritionPlans';
import {applyServerErrors, getPageTitle, useUnsavedChangesWarning} from '@/features/library/formPageHelpers';
import {getReturnTo} from '@/features/library/libraryFormShared';
import NutritionPlanFormFields from '@/features/library/nutrition-plans/NutritionPlanFormFields';
import {
  buildNutritionPlanPayload,
  mapNutritionPlanToFormValues,
  NUTRITION_PLAN_FORM_SCHEMA,
  NUTRITION_PLAN_INITIAL_VALUES,
} from '@/features/library/nutrition-plans/nutritionPlanFormSchema';
import {handleFormError} from '@/shared/api/shared';
import FormPageShell from '@/shared/ui/forms/FormPageShell';

const FIELD_MAP: Record<string, FieldPath<NutritionPlanFormValues>> = {
  calories: 'calories',
  carbs: 'carbs',
  description: 'description',
  fat: 'fat',
  name: 'name',
  protein: 'protein',
  status: 'status',
  tags: 'tags',
  type: 'type',
};

export default function NutritionPlanFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const returnTo = getReturnTo(location, '/library');

  const {
    data: nutritionPlanData,
    isError: isNutritionPlanError,
    isLoading: isNutritionPlanLoading,
    refetch: refetchNutritionPlan,
  } = useGetNutritionPlanQuery(id ?? '', {skip: !id});

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm<NutritionPlanFormValues>({
    defaultValues: NUTRITION_PLAN_INITIAL_VALUES,
    resolver: zodResolver(NUTRITION_PLAN_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(NUTRITION_PLAN_INITIAL_VALUES);
      return;
    }
    if (nutritionPlanData?.data) {
      reset(mapNutritionPlanToFormValues(nutritionPlanData.data));
    }
  }, [isEditing, nutritionPlanData?.data, reset]);

  const [createNutritionPlan, {isLoading: isCreating}] = useCreateNutritionPlanMutation();
  const [deleteNutritionPlan, {isLoading: isDeleting}] = useDeleteNutritionPlanMutation();
  const [updateNutritionPlan, {isLoading: isUpdating}] = useUpdateNutritionPlanMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  useUnsavedChangesWarning(hasPendingChanges);
  const onBack = () => navigate(returnTo);
  const pageTitle = getPageTitle(isEditing, 'Nutrition Plan', nutritionPlanData?.data?.name);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = buildNutritionPlanPayload(values, isEditing);
    try {
      const response = id
        ? await updateNutritionPlan({body: payload, id}).unwrap()
        : await createNutritionPlan(payload).unwrap();

      toast.success(
        id
          ? `Nutrition plan "${values.name.trim()}" updated successfully.`
          : `Nutrition plan "${values.name.trim()}" created successfully.`,
      );
      reset(values);

      if (id) {
        navigate(returnTo);
        return;
      }

      navigate(`/library/nutrition-plans/${response.data.id}/builder`, {
        state: {from: returnTo},
      });
    } catch (err) {
      const result = handleFormError(
        err,
        id
          ? 'Unable to update nutrition plan. Please try again.'
          : 'Unable to create nutrition plan. Please try again.',
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
    if (!id || !nutritionPlanData?.data) return;
    try {
      await deleteNutritionPlan(id).unwrap();
      toast.success(`Nutrition plan "${nutritionPlanData.data.name}" deleted successfully.`);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete nutrition plan. Please try again.');
      toast.danger(result.formError);
    }
  };

  return (
    <FormPageShell
      actions={{
        deleteLabel: 'Delete nutrition plan',
        entityName: nutritionPlanData?.data?.name,
        isDeleting,
        isSubmitting,
        onBack,
        onDelete: isEditing ? handleDelete : undefined,
        onSubmit,
        submitLabel: isEditing ? 'Save plan' : 'Create plan',
      }}
      formError={formError}
      header={{
        breadcrumb: 'Library',
        description: 'Define plan metadata, intent, and macro goals before building meals and schedule.',
        title: pageTitle,
      }}
      state={{
        hasPendingChanges,
        isError: isEditing && isNutritionPlanError,
        isLoading: isEditing && isNutritionPlanLoading,
        onRetry: refetchNutritionPlan,
      }}
    >
      <NutritionPlanFormFields
        control={control}
        errors={errors}
        isEditing={isEditing}
        register={register}
        setValue={setValue}
      />
    </FormPageShell>
  );
}
