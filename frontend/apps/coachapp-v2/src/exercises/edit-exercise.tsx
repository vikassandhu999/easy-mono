import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
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

// Mounts only when exercise data is available, so useState(exercise.images) initialises without useEffect.
function EditExerciseForm({
  backPath,
  exercise,
  exerciseId,
}: {
  backPath: string;
  exercise: Exercise;
  exerciseId: string;
}) {
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
      goBack();
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit exercise</Page.Title>
          <Page.Description>{exercise.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Exercise
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <ExerciseForm
          equipment={equipmentData?.data ?? []}
          form={form}
          images={images}
          isSubmitting={isUpdating}
          muscles={musclesData?.data ?? []}
          onCancel={goBack}
          onImagesChange={setImages}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditExercise() {
  const {id} = useParams<{id: string}>();
  const {data, isLoading: isFetching} = useGetExerciseQuery(id!);

  const exercise = data?.data;
  const backPath = `/library/exercises/${id}`;

  if (isFetching || !exercise) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit exercise</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
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
