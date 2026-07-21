import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useListEquipmentQuery, useListMusclesQuery} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import {useCreateCoachTrainingExerciseMutation} from '@/api/training-exercises';
import ExerciseForm, {
  type ExerciseFormValues,
  exerciseToCreateRequest,
  useExerciseForm,
} from '@/exercises/exercise-form/exercise-form';

export default function CreateExercise() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.EXERCISES);
  const [createExercise, {isLoading}] = useCreateCoachTrainingExerciseMutation();
  const {data: musclesData} = useListMusclesQuery({});
  const {data: equipmentData} = useListEquipmentQuery({});
  const form = useExerciseForm();

  const onSubmit = async (data: ExerciseFormValues) => {
    try {
      const result = await createExercise({trainingExerciseCreateRequest: exerciseToCreateRequest(data)}).unwrap();
      navigate(`/library/exercises/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>Create exercise</Page.Title>
          </div>
          <Page.Description>Add a custom movement to your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="pt-4 pb-6">
        <ExerciseForm
          equipment={equipmentData?.data ?? []}
          form={form}
          isSubmitting={isLoading}
          muscles={musclesData?.data ?? []}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Create exercise"
          submittingLabel="Creating exercise"
        />
      </Page.Content>
    </Page>
  );
}
