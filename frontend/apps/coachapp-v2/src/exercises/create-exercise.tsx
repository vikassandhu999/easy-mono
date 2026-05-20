import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateExerciseMutation, useListEquipmentQuery, useListMusclesQuery} from '@/api/exercises';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {type ExerciseFormValues, useExerciseForm} from '@/exercises/exercise-form/exercise-form';

export default function CreateExercise() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.EXERCISES);
  const [createExercise, {isLoading}] = useCreateExerciseMutation();
  const {data: musclesData} = useListMusclesQuery();
  const {data: equipmentData} = useListEquipmentQuery();
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
        ...((data.images?.length ?? 0) > 0 && {images: data.images}),
      };
      const result = await createExercise(body).unwrap();
      navigate(`/library/exercises/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Create exercise</Page.Title>
          <Page.Description>Add muscles, equipment, instructions, and images</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Exercises
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <ExerciseForm
          equipment={equipmentData?.data ?? []}
          form={form}
          isSubmitting={isLoading}
          muscles={musclesData?.data ?? []}
          onCancel={() => navigate(ROUTES.EXERCISES)}
          onSubmit={onSubmit}
          submitLabel="Create exercise"
          submittingLabel="Creating exercise"
        />
      </Page.Content>
    </Page>
  );
}
