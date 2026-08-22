import {ErrorMessage, Fieldset} from '@heroui/react';
import {generatePath, useLocation, useNavigate} from 'react-router-dom';
import {applyFormErrors} from '@/api/shared';
import {
  useCopyExerciseMutation,
  useCreateCoachTrainingExerciseMutation,
  useExerciseOptionsQueries,
} from '@/api/training-exercises';
import ExerciseForm, {exerciseToCreateRequest, useExerciseForm} from '@/exercises/exercise-form';
import type {ExerciseFormValues} from '@/exercises/exercise-form-schema';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormTextField} from '@/ui/form-text-field';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';

export default function CreateExercise() {
  const {state} = useLocation();
  const duplicateFrom = (state as null | {duplicateFrom?: {id: string; name: string}})?.duplicateFrom;

  return duplicateFrom ? <DuplicateExercise source={duplicateFrom} /> : <NewExercise />;
}

function DuplicateExercise({source}: {source: {id: string; name: string}}) {
  const navigate = useNavigate();
  const backPath = generatePath(ROUTES.EXERCISE_DETAIL, {id: source.id});
  const goBack = useGoBack(backPath);
  const copyExerciseMutation = useCopyExerciseMutation();
  const form = useExerciseForm();

  const onSubmit = async (data: ExerciseFormValues) => {
    try {
      const result = await copyExerciseMutation.mutateAsync({id: source.id, body: {name: data.name}});
      navigate(generatePath(ROUTES.EXERCISE_DETAIL, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't duplicated. Check the name and try again", form.setError, ['name']);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className="flex items-center">
            <BackButton onPress={goBack} />
            <Page.Title>Duplicate exercise</Page.Title>
          </div>
          <Page.Description>Name the copy for your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <FormLayout onSubmit={form.handleSubmit(onSubmit)}>
            <Fieldset>
              <Fieldset.Legend>Details</Fieldset.Legend>
              <Fieldset.Group>
                <FormTextField
                  control={form.control}
                  fullWidth
                  inputProps={{placeholder: `e.g. ${source.name} variation`}}
                  isRequired
                  label="Name"
                  name="name"
                />
              </Fieldset.Group>
            </Fieldset>
            {form.formState.errors.root ? <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage> : null}
            <FormActions
              isSubmitting={copyExerciseMutation.isPending}
              onCancel={goBack}
              submitLabel="Duplicate exercise"
              submittingLabel="Duplicating exercise"
            />
          </FormLayout>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

function NewExercise() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.EXERCISES);
  const createExerciseMutation = useCreateCoachTrainingExerciseMutation();
  const options = useExerciseOptionsQueries();
  const form = useExerciseForm();

  const onSubmit = async (data: ExerciseFormValues) => {
    try {
      const result = await createExerciseMutation.mutateAsync(exerciseToCreateRequest(data));
      navigate(generatePath(ROUTES.EXERCISE_DETAIL, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Exercise wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Create exercise</Page.Title>
          </div>
          <Page.Description>Add a custom movement to your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
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
              isSubmitting={createExerciseMutation.isPending}
              muscles={options.muscles}
              onCancel={goBack}
              onSubmit={onSubmit}
              submitLabel="Create exercise"
              submittingLabel="Creating exercise"
            />
          )}
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
