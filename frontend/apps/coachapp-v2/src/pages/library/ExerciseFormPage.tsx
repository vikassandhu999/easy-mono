import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {type FieldPath, useForm} from 'react-hook-form';
import {useLocation, useNavigate, useParams} from 'react-router';

import type {ExerciseFormValues} from '@/pages/library/exerciseFormTypes';

import {
  useCreateExerciseMutation,
  useDeleteExerciseMutation,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from '@/api/exercises';
import {handleFormError} from '@/api/shared';
import ExerciseFormFields from '@/components/ExerciseFormFields';
import FormPageShell from '@/components/FormPageShell';
import {
  buildExercisePayload,
  EXERCISE_FORM_SCHEMA,
  EXERCISE_INITIAL_VALUES,
  mapExerciseToFormValues,
} from '@/pages/library/exerciseFormSchema';
import {applyServerErrors, getPageTitle, useUnsavedChangesWarning} from '@/pages/library/formPageHelpers';
import {getReturnTo} from '@/pages/library/libraryFormShared';

const FIELD_MAP: Record<string, FieldPath<ExerciseFormValues>> = {
  description: 'description',
  equipment_ids: 'equipment_ids',
  force: 'force',
  instructions: 'instructions',
  mechanics: 'mechanics',
  muscle_ids: 'muscle_ids',
  name: 'name',
};

export default function ExerciseFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const isEditing = Boolean(id);
  const [formError, setFormError] = useState<null | string>(null);
  const returnTo = getReturnTo(location, '/library');

  const {
    data: exerciseData,
    isError: isExerciseError,
    isLoading: isExerciseLoading,
    refetch: refetchExercise,
  } = useGetExerciseQuery(id ?? '', {skip: !id});

  const {
    data: musclesData,
    isError: isMusclesError,
    isLoading: isMusclesLoading,
    refetch: refetchMuscles,
  } = useListMusclesQuery();

  const {
    data: equipmentData,
    isError: isEquipmentError,
    isLoading: isEquipmentLoading,
    refetch: refetchEquipment,
  } = useListEquipmentQuery();

  const {
    control,
    formState: {errors, isDirty},
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ExerciseFormValues>({
    defaultValues: EXERCISE_INITIAL_VALUES,
    resolver: zodResolver(EXERCISE_FORM_SCHEMA),
  });

  useEffect(() => {
    if (!isEditing) {
      reset(EXERCISE_INITIAL_VALUES);
      return;
    }
    if (exerciseData?.data) {
      reset(mapExerciseToFormValues(exerciseData.data));
    }
  }, [exerciseData?.data, isEditing, reset]);

  const [createExercise, {isLoading: isCreating}] = useCreateExerciseMutation();
  const [deleteExercise, {isLoading: isDeleting}] = useDeleteExerciseMutation();
  const [updateExercise, {isLoading: isUpdating}] = useUpdateExerciseMutation();
  const isSubmitting = isCreating || isUpdating;
  const hasPendingChanges = isDirty && !isSubmitting;

  useUnsavedChangesWarning(hasPendingChanges);
  const onBack = () => navigate(returnTo);
  const pageTitle = getPageTitle(isEditing, 'Exercise', exerciseData?.data?.name);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = buildExercisePayload(values);
    try {
      if (id) {
        await updateExercise({body: payload, id}).unwrap();
        toast.success(`Exercise "${values.name.trim()}" updated successfully.`);
      } else {
        await createExercise(payload).unwrap();
        toast.success(`Exercise "${values.name.trim()}" created successfully.`);
      }
      reset(values);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(
        err,
        id ? 'Unable to update exercise. Please try again.' : 'Unable to create exercise. Please try again.',
      );
      if (result.fieldErrors) {
        applyServerErrors(result.fieldErrors, setError, FIELD_MAP);
        if (result.fieldErrors.images) {
          setError('images.0.url', {
            message: result.fieldErrors.images[0],
            type: 'server',
          });
        }
      }
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const handleDelete = async () => {
    if (!id || !exerciseData?.data) return;
    try {
      await deleteExercise(id).unwrap();
      toast.success(`Exercise "${exerciseData.data.name}" deleted successfully.`);
      navigate(returnTo);
    } catch (err) {
      const result = handleFormError(err, 'Unable to delete exercise. Please try again.');
      toast.danger(result.formError);
    }
  };

  return (
    <FormPageShell
      actions={{
        deleteLabel: 'Delete exercise',
        entityName: exerciseData?.data?.name,
        isDeleting,
        isSubmitting,
        onBack,
        onDelete: isEditing ? handleDelete : undefined,
        onSubmit,
        submitLabel: isEditing ? 'Save exercise' : 'Create exercise',
      }}
      formError={formError}
      header={{
        breadcrumb: 'Library',
        description:
          'Add or update a shared exercise with movement details, target muscles, equipment, and image URLs.',
        title: pageTitle,
      }}
      state={{
        hasPendingChanges,
        isError: isEditing && isExerciseError,
        isLoading: isEditing && isExerciseLoading,
        onRetry: refetchExercise,
      }}
    >
      <ExerciseFormFields
        control={control}
        equipment={{
          data: equipmentData?.data ?? [],
          isError: isEquipmentError,
          isLoading: isEquipmentLoading,
          onRetry: refetchEquipment,
        }}
        errors={errors}
        muscles={{
          data: musclesData?.data ?? [],
          isError: isMusclesError,
          isLoading: isMusclesLoading,
          onRetry: refetchMuscles,
        }}
        register={register}
      />
    </FormPageShell>
  );
}
