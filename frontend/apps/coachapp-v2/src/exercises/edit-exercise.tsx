import {Spinner} from '@heroui/react';
import {Navigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  type TrainingExercise,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import ExerciseForm, {
  type ExerciseFormValues,
  exerciseToFormValues,
  exerciseToUpdateRequest,
  useExerciseForm,
} from '@/exercises/exercise-form/exercise-form';

// One header for every state (loading / error / loaded) so the back button,
// title, and description slot never shift between them.
function EditExerciseHeader({goBack, name}: {goBack: () => void; name?: string}) {
  return (
    <Page.Header>
      <Page.TitleGroup>
        <div className={'flex items-center gap-1'}>
          <BackButton onPress={goBack} />
          <Page.Title>Edit exercise</Page.Title>
        </div>
        {name ? <Page.Description>{name}</Page.Description> : null}
      </Page.TitleGroup>
    </Page.Header>
  );
}

// Mounts only when exercise data is available, so useState(exercise.images) initialises without useEffect.
function EditExerciseForm({
  backPath,
  exercise,
  exerciseId,
}: {
  backPath: string;
  exercise: TrainingExercise;
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
      await updateExercise({id: exerciseId, trainingExerciseUpdateRequest: exerciseToUpdateRequest(formData)}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <EditExerciseHeader
        goBack={goBack}
        name={exercise.name}
      />
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
      </Page.Content>
    </Page>
  );
}

export default function EditExercise() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetExerciseQuery({id: id!});

  const exercise = data?.data;
  const backPath = `/library/exercises/${id}`;
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <EditExerciseHeader goBack={goBack} />
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !exercise) {
    return (
      <Page>
        <EditExerciseHeader goBack={goBack} />
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load exercise." />
        </Page.Content>
      </Page>
    );
  }

  // Guard: system exercises cannot be edited — redirect to detail page
  if (exercise.source === 'system') {
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
