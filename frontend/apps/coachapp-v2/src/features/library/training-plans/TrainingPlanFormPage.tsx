import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';

import type {TrainingPlanFormValues} from '@/features/library/training-plans/trainingPlanFormTypes';

import {useListClientsQuery} from '@/entities/clients/api/clients';
import {
  useCreateTrainingPlanMutation,
  useDeleteTrainingPlanMutation,
  useGetTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
} from '@/entities/trainingPlans/api/trainingPlans';
import {applyServerErrors, getPageTitle, useUnsavedChangesWarning} from '@/features/library/formPageHelpers';
import {getReturnTo} from '@/features/library/libraryFormShared';
import TrainingPlanFormFields from '@/features/library/training-plans/TrainingPlanFormFields';
import {
  buildTrainingPlanPayload,
  mapTrainingPlanToFormValues,
  TRAINING_PLAN_FORM_SCHEMA,
  TRAINING_PLAN_INITIAL_VALUES,
} from '@/features/library/training-plans/trainingPlanFormSchema';
import {handleFormError} from '@/shared/api/shared';
import FormPageShell from '@/shared/ui/forms/FormPageShell';

const FIELD_MAP: Record<string, FieldPath<TrainingPlanFormValues>> = {
  client_id: 'client_id',
  description: 'description',
  end_date: 'end_date',
  is_template: 'is_template',
  name: 'name',
  start_date: 'start_date',
  status: 'status',
};

export default function TrainingPlanFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams({strict: false});
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const returnTo = getReturnTo(location.state, '/library');

  const {
    data: trainingPlanData,
    isError: isTrainingPlanError,
    isLoading: isTrainingPlanLoading,
    refetch: refetchTrainingPlan,
  } = useGetTrainingPlanQuery(id ?? '', {skip: !id});

  const {data: clientsData} = useListClientsQuery({limit: 200, offset: 0});

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm<TrainingPlanFormValues>({
    defaultValues: TRAINING_PLAN_INITIAL_VALUES,
    resolver: zodResolver(TRAINING_PLAN_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(TRAINING_PLAN_INITIAL_VALUES);
      return;
    }
    if (trainingPlanData?.data) {
      reset(mapTrainingPlanToFormValues(trainingPlanData.data));
    }
  }, [isEditing, trainingPlanData?.data, reset]);

  const [createTrainingPlan, {isLoading: isCreating}] = useCreateTrainingPlanMutation();
  const [deleteTrainingPlan, {isLoading: isDeleting}] = useDeleteTrainingPlanMutation();
  const [updateTrainingPlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  useUnsavedChangesWarning(hasPendingChanges);
  const onBack = () => navigate({to: returnTo});
  const pageTitle = getPageTitle(isEditing, 'Training Plan', trainingPlanData?.data?.name);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = buildTrainingPlanPayload(values);
    try {
      const response = id
        ? await updateTrainingPlan({body: payload, id}).unwrap()
        : await createTrainingPlan(payload).unwrap();

      toast.success(
        id
          ? `Training plan "${values.name.trim()}" updated successfully.`
          : `Training plan "${values.name.trim()}" created successfully.`,
      );
      reset(values);

      if (id) {
        navigate({to: returnTo});
        return;
      }

      navigate({to: `/library/training-plans/${response.data.id}/builder`, state: {from: returnTo}});
    } catch (err) {
      const result = handleFormError(
        err,
        id ? 'Unable to update training plan. Please try again.' : 'Unable to create training plan. Please try again.',
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
    if (!id || !trainingPlanData?.data) return;
    try {
      await deleteTrainingPlan(id).unwrap();
      toast.success(`Training plan "${trainingPlanData.data.name}" deleted successfully.`);
      navigate({to: returnTo});
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete training plan. Please try again.');
      toast.danger(result.formError);
    }
  };

  return (
    <FormPageShell
      actions={{
        deleteLabel: 'Delete training plan',
        entityName: trainingPlanData?.data?.name,
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
        title: pageTitle,
      }}
      state={{
        hasPendingChanges,
        isError: isEditing && isTrainingPlanError,
        isLoading: isEditing && isTrainingPlanLoading,
        onRetry: refetchTrainingPlan,
      }}
    >
      <TrainingPlanFormFields
        clients={clientsData?.data ?? []}
        control={control}
        errors={errors}
        isEditing={isEditing}
        setValue={setValue}
      />
    </FormPageShell>
  );
}
