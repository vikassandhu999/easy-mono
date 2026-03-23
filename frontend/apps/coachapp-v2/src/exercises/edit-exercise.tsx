import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from '@/api/exercises';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {type ExerciseFormValues, useExerciseForm} from '@/exercises/components/exercise-form';

export default function EditExercise() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isLoading: isFetching} = useGetExerciseQuery(id!);
  const [updateExercise, {isLoading: isUpdating}] = useUpdateExerciseMutation();
  const {data: musclesData} = useListMusclesQuery();
  const {data: equipmentData} = useListEquipmentQuery();

  const exercise = data?.data;
  const backPath = `/library/exercises/${id}`;

  const form = useExerciseForm({
    values: exercise
      ? {
          description: exercise.description ?? '',
          equipment_ids: exercise.equipment.map((e) => e.id),
          force: exercise.force ?? '',
          instructions: exercise.instructions ?? '',
          mechanics: exercise.mechanics ?? '',
          muscle_ids: exercise.muscles.map((m) => m.id),
          name: exercise.name,
        }
      : undefined,
  });

  if (isFetching || !exercise) {
    return (
      <PageLayout title="Edit Exercise">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  const onSubmit = async (formData: ExerciseFormValues) => {
    try {
      const mechanics = formData.mechanics || undefined;
      const force = formData.force || undefined;
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        instructions: formData.instructions || undefined,
        ...(mechanics && {mechanics}),
        ...(force && {force}),
        muscle_ids: formData.muscle_ids ?? [],
        equipment_ids: formData.equipment_ids ?? [],
      };
      await updateExercise({body, id: id!}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update exercise. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={exercise.name}
      title="Edit Exercise"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(backPath)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <ExerciseForm
        equipment={equipmentData?.data ?? []}
        form={form}
        isSubmitting={isUpdating}
        muscles={musclesData?.data ?? []}
        onCancel={() => navigate(backPath)}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}
