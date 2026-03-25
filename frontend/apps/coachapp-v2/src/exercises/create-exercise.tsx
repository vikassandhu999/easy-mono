import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateExerciseMutation, useListEquipmentQuery, useListMusclesQuery} from '@/api/exercises';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {type ExerciseFormValues, useExerciseForm} from '@/exercises/components/exercise-form';

export default function CreateExercise() {
  const navigate = useNavigate();
  const [createExercise, {isLoading}] = useCreateExerciseMutation();
  const {data: musclesData} = useListMusclesQuery();
  const {data: equipmentData} = useListEquipmentQuery();
  const [images, setImages] = useState<string[]>([]);

  const form = useExerciseForm();

  const onSubmit = async (data: ExerciseFormValues) => {
    try {
      const mechanics = data.mechanics || undefined;
      const force = data.force || undefined;
      const body = {
        name: data.name,
        ...(data.description && {description: data.description}),
        ...(data.instructions && {instructions: data.instructions}),
        ...(mechanics && {mechanics}),
        ...(force && {force}),
        ...(data.muscle_ids?.length && {muscle_ids: data.muscle_ids}),
        ...(data.equipment_ids?.length && {
          equipment_ids: data.equipment_ids,
        }),
        ...(images.length > 0 && {images}),
      };
      const result = await createExercise(body).unwrap();
      navigate(`/library/exercises/${result.data.id}`);
    } catch (err) {
      applyFormErrors(err, 'Failed to create exercise. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Add a new exercise to your library."
      title="Create Exercise"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.EXERCISES)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Exercises
        </Button>
      </div>

      <ExerciseForm
        equipment={equipmentData?.data ?? []}
        form={form}
        images={images}
        isSubmitting={isLoading}
        muscles={musclesData?.data ?? []}
        onCancel={() => navigate(ROUTES.EXERCISES)}
        onImagesChange={setImages}
        onSubmit={onSubmit}
        submitLabel="Create Exercise"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
