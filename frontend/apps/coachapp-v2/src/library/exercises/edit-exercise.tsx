import {generatePath, Navigate} from 'react-router-dom';
import {applyFormErrors} from '@/api/shared';
import {
  type TrainingExercise,
  useExerciseOptionsQueries,
  useGetExerciseQuery,
  useUpdateExerciseMutation,
} from '@/api/training-exercises';
import ExerciseForm, {
  exerciseToFormValues,
  exerciseToMediaValue,
  exerciseToUpdateRequest,
  useExerciseForm,
} from '@/library/exercises/exercise-form';
import type {ExerciseFormValues} from '@/library/exercises/exercise-form-schema';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

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
  const options = useExerciseOptionsQueries();

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

  return (
    <Page>
      <EditExerciseHeader goBack={goBack} />
      <Page.Content
        bare
        className="pt-4 pb-6"
      >
        <Page.Frame size="content">
          {options.isError ? (
            <ErrorState
              message="Couldn't load exercise options."
              onRetry={options.retry}
            />
          ) : options.isLoading ? (
            <PageSkeleton />
          ) : (
            <ExerciseForm
              equipment={options.equipment}
              form={form}
              initialMedia={exerciseToMediaValue(exercise)}
              isSubmitting={updateExerciseMutation.isPending}
              muscles={options.muscles}
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
  const id = useRouteParam('id');
  const {data, isError, isLoading: isFetching, refetch} = useGetExerciseQuery(id);

  const exercise = data?.data;
  const backPath = generatePath(ROUTES.EXERCISE_DETAIL, {id});
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
      exerciseId={id}
    />
  );
}
