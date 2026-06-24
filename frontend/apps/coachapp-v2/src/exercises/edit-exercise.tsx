import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {Navigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {type Exercise, useGetExerciseQuery, useUpdateExerciseMutation} from '@/api/exercises';
import {useListEquipmentQuery, useListMusclesQuery} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {
  type ExerciseFormValues,
  exerciseToFormValues,
  exerciseToUpdateRequest,
  useExerciseForm,
} from '@/exercises/exercise-form/exercise-form';

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
  const {data: musclesData} = useListMusclesQuery({});
  const {data: equipmentData} = useListEquipmentQuery({});

  const form = useExerciseForm({
    values: exerciseToFormValues(exercise),
  });

  const onSubmit = async (formData: ExerciseFormValues) => {
    try {
      await updateExercise({body: exerciseToUpdateRequest(formData), id: exerciseId}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't updated. Check the details and try again", form.setError);
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
            <Page.Title>Edit exercise</Page.Title>
          </div>
          <Page.Description>{exercise.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className={'max-w-160 mt-4'}>
          <ExerciseForm
            equipment={equipmentData?.data ?? []}
            form={form}
            isSubmitting={isUpdating}
            muscles={musclesData?.data ?? []}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Save changes"
            submittingLabel="Saving changes"
          />
        </div>
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
