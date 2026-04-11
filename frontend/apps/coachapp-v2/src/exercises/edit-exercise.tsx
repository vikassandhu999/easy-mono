import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type Exercise,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from '@/api/exercises';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {type ExerciseFormValues, useExerciseForm} from '@/exercises/components/exercise-form';

/** Inner component that mounts only when exercise data is available.
 *  This lets us initialise useState(exercise.images) without useEffect. */
function EditExerciseForm({
  backPath,
  exercise,
  exerciseId,
}: {
  backPath: string;
  exercise: Exercise;
  exerciseId: string;
}) {
  const navigate = useNavigate();
  const goBack = useGoBack(backPath);
  const [updateExercise, {isLoading: isUpdating}] = useUpdateExerciseMutation();
  const {data: musclesData} = useListMusclesQuery();
  const {data: equipmentData} = useListEquipmentQuery();
  const [images, setImages] = useState<string[]>(exercise.images);

  const form = useExerciseForm({
    values: {
      description: exercise.description ?? '',
      equipment_ids: exercise.equipment.map((e) => e.id),
      force: exercise.force ?? '',
      instructions: exercise.instructions ?? '',
      mechanics: exercise.mechanics ?? '',
      muscle_ids: exercise.muscles.map((m) => m.id),
      name: exercise.name,
    },
  });

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
        images,
      };
      await updateExercise({body, id: exerciseId}).unwrap();
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
          onPress={goBack}
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
        images={images}
        isSubmitting={isUpdating}
        muscles={musclesData?.data ?? []}
        onCancel={() => navigate(backPath)}
        onImagesChange={setImages}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}

export default function EditExercise() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading: isFetching} = useGetExerciseQuery(id!);

  const exercise = data?.data;
  const backPath = `/library/exercises/${id}`;

  if (isFetching || !exercise) {
    return (
      <PageLayout title="Edit Exercise">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  // Guard: system exercises cannot be edited — redirect to detail page
  if (exercise.business_id === null) {
    return (
      <Navigate
        replace
        to={backPath}
      />
    );
  }

  return (
    <EditExerciseForm
      backPath={backPath}
      exercise={exercise}
      exerciseId={id!}
    />
  );
}
