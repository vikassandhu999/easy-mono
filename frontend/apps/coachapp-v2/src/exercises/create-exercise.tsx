import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateExerciseMutation, useListEquipmentQuery, useListMusclesQuery} from '@/api/exercises';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {
  type ExerciseFormValues,
  exerciseToCreateRequest,
  useExerciseForm,
} from '@/exercises/exercise-form/exercise-form';

export default function CreateExercise() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.EXERCISES);
  const [createExercise, {isLoading}] = useCreateExerciseMutation();
  const {data: musclesData} = useListMusclesQuery();
  const {data: equipmentData} = useListEquipmentQuery();
  const form = useExerciseForm();

  const onSubmit = async (data: ExerciseFormValues) => {
    try {
      const result = await createExercise(exerciseToCreateRequest(data)).unwrap();
      navigate(`/library/exercises/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Create exercise</Page.Title>
          </div>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className={'max-w-160 mt-4'}>
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
        </div>
      </Page.Content>
    </Page>
  );
}
