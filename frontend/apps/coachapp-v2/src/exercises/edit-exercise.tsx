import {generatePath, Navigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {applyFormErrors} from '@/api/shared';
import {
  type TrainingExercise,
  useGetExerciseQuery,
  useListEquipmentQuery,
  useListMusclesQuery,
  useUpdateExerciseMutation,
} from '@/api/training-exercises';
import ExerciseForm, {
  type ExerciseFormValues,
  exerciseToFormValues,
  exerciseToMediaValue,
  exerciseToUpdateRequest,
  useExerciseForm,
} from '@/exercises/exercise-form/exercise-form';

// One header for every state (loading / error / loaded) so the back button,
// title, and description slot never shift between them.
function EditExerciseHeader({goBack}: {goBack: () => void}) {
  return (
    <Page.Header size="content">
      <Page.TitleGroup>
        <div className={'flex items-center'}>
          <BackButton onPress={goBack} />
          <Page.Title>Edit exercise</Page.Title>
        </div>
        <Page.Description>Update this movement in your library.</Page.Description>
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
  const updateExerciseMutation = useUpdateExerciseMutation();
  const musclesQuery = useListMusclesQuery({});
  const equipmentQuery = useListEquipmentQuery({});

  const form = useExerciseForm({
    values: exerciseToFormValues(exercise),
  });

  const onSubmit = async (formData: ExerciseFormValues) => {
    try {
      await updateExerciseMutation.mutateAsync({id: exerciseId, body: exerciseToUpdateRequest(formData)});
      goBack();
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't updated. Check the details and try again", form.setError);
    }
  };

  const retryReferences = async () => {
    await Promise.all([
      ...(musclesQuery.isError ? [musclesQuery.refetch()] : []),
      ...(equipmentQuery.isError ? [equipmentQuery.refetch()] : []),
    ]);
  };

  return (
    <Page>
      <EditExerciseHeader goBack={goBack} />
      <Page.Content
        bare
        className="pt-4 pb-6"
      >
        <Page.Frame size="content">
          {musclesQuery.isError || equipmentQuery.isError ? (
            <ErrorState
              message="Couldn't load exercise options."
              onRetry={retryReferences}
            />
          ) : musclesQuery.isLoading || equipmentQuery.isLoading ? (
            <PageSkeleton />
          ) : (
            <ExerciseForm
              equipment={equipmentQuery.data?.data ?? []}
              form={form}
              initialMedia={exerciseToMediaValue(exercise)}
              isSubmitting={updateExerciseMutation.isPending}
              muscles={musclesQuery.data?.data ?? []}
              onCancel={goBack}
              onSubmit={onSubmit}
              submitLabel="Save changes"
              submittingLabel="Saving changes"
            />
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

export default function EditExercise() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching, refetch} = useGetExerciseQuery(id!);

  const exercise = data?.data;
  const backPath = generatePath(ROUTES.EXERCISE_DETAIL, {id: id!});
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <EditExerciseHeader goBack={goBack} />
        <Page.Content
          bare
          className="pt-4 pb-6"
        >
          <Page.Frame size="content">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !exercise) {
    return (
      <Page>
        <EditExerciseHeader goBack={goBack} />
        <Page.Content
          bare
          className="pt-4 pb-6"
        >
          <Page.Frame size="content">
            <ErrorState
              message="Couldn't load exercise."
              onRetry={refetch}
            />
          </Page.Frame>
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
