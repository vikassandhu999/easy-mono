import {Description, ErrorMessage, Fieldset, ListBox, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {FieldRow} from '@/@components/form-fields/field-row';
import {FormActions} from '@/@components/form-fields/form-actions';
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-classes';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormSelectField} from '@/@components/form-fields/form-select-field';
import {FormTextAreaField} from '@/@components/form-fields/form-text-area-field';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import LibraryMediaField, {type LibraryMediaValue} from '@/@components/library-media-field';
import MultiSelectAutocomplete from '@/@components/multi-select-autocomplete';
import {omitUndefined, toOptionalText} from '@/api/shared';
import type {
  TrainingExercise,
  TrainingExerciseCreateRequest,
  TrainingExerciseRelation,
  TrainingExerciseUpdateRequest,
} from '@/api/training-exercises';
import {
  EXERCISE_FORM_DEFAULTS,
  type ExerciseFormValues,
  exerciseFormSchema,
} from '@/exercises/exercise-form/exercise-form-schema';

type ExerciseMechanics = 'compound' | 'isolation' | 'isometric';
type ExerciseForce = 'push' | 'pull' | 'static';

const MECHANICS_OPTIONS: {label: string; value: ExerciseMechanics}[] = [
  {label: 'Compound', value: 'compound'},
  {label: 'Isolation', value: 'isolation'},
  {label: 'Isometric', value: 'isometric'},
];

const FORCE_OPTIONS: {label: string; value: ExerciseForce}[] = [
  {label: 'Push', value: 'push'},
  {label: 'Pull', value: 'pull'},
  {label: 'Static', value: 'static'},
];

export function useExerciseForm(options?: {values?: ExerciseFormValues}) {
  return useForm<ExerciseFormValues>({
    defaultValues: options?.values ? undefined : EXERCISE_FORM_DEFAULTS,
    resolver: zodResolver(exerciseFormSchema),
    values: options?.values,
  });
}

export function exerciseToFormValues(exercise: TrainingExercise): ExerciseFormValues {
  return {
    description: exercise.description ?? '',
    equipment_ids: exercise.equipment.map((item) => item.id),
    force: exercise.force ?? '',
    image_url: '',
    images: exercise.images,
    instructions: exercise.instructions ?? '',
    mechanics: exercise.mechanics ?? '',
    media_id: exercise.media?.id ?? null,
    muscle_ids: exercise.muscles.map((item) => item.id),
    name: exercise.name,
  };
}

export function exerciseToMediaValue(exercise: TrainingExercise): LibraryMediaValue | null {
  return exercise.media
    ? {contentType: exercise.media.content_type, kind: exercise.media.kind, url: exercise.media.url}
    : null;
}

export function exerciseToCreateRequest(values: ExerciseFormValues): TrainingExerciseCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    instructions: toOptionalText(values.instructions),
    mechanics: values.mechanics || undefined,
    force: values.force || undefined,
    muscle_ids: values.muscle_ids?.length ? values.muscle_ids : undefined,
    equipment_ids: values.equipment_ids?.length ? values.equipment_ids : undefined,
    images: values.images?.length ? values.images : undefined,
    media_id: values.media_id ?? undefined,
  });
}

export function exerciseToUpdateRequest(values: ExerciseFormValues): TrainingExerciseUpdateRequest {
  return {
    name: values.name,
    description: toOptionalText(values.description),
    instructions: toOptionalText(values.instructions),
    mechanics: values.mechanics || undefined,
    force: values.force || undefined,
    muscle_ids: values.muscle_ids ?? [],
    equipment_ids: values.equipment_ids ?? [],
    images: values.images ?? [],
    media_id: values.media_id ?? null,
  };
}

type ExerciseFormProps = {
  equipment: TrainingExerciseRelation[];
  form: ReturnType<typeof useExerciseForm>;
  initialMedia?: LibraryMediaValue | null;
  isSubmitting: boolean;
  muscles: TrainingExerciseRelation[];
  onCancel: () => void;
  onSubmit: (data: ExerciseFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function ExerciseForm({
  equipment,
  form,
  initialMedia,
  isSubmitting,
  muscles,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: ExerciseFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    setValue,
  } = form;

  const [mediaBusy, setMediaBusy] = useState(false);

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div className={RESPONSIVE_FORM_SECTION_CLASS}>
        <Fieldset>
          <Fieldset.Legend className="hidden sm:block">Details</Fieldset.Legend>
          <Description className="hidden sm:block">Name the movement and describe how it's performed.</Description>
          <Fieldset.Group>
            <LibraryMediaField
              initialMedia={initialMedia}
              onBusyChange={setMediaBusy}
              onChange={(mediaId) => setValue('media_id', mediaId, {shouldDirty: true})}
            />
            <Description className="text-muted">
              Uploads are public by URL. Don't upload client photos or private material.
            </Description>

            <div className="border-t border-separator pt-5 sm:hidden">
              <Typography weight="semibold">Details</Typography>
            </div>

            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Bulgarian Split Squat'}}
              isRequired
              label="Name"
              name="name"
            />

            <FormTextAreaField
              control={control}
              fullWidth
              label="Description"
              name="description"
              textAreaProps={{placeholder: 'Short summary of the movement…', rows: 3}}
            />

            <FormTextAreaField
              control={control}
              fullWidth
              label="Instructions"
              name="instructions"
              textAreaProps={{placeholder: 'Add cues, setup notes, and execution steps', rows: 4}}
            />
          </Fieldset.Group>
        </Fieldset>

        <div className="my-6 border-t border-separator" />

        <Fieldset>
          <Fieldset.Legend>Attributes</Fieldset.Legend>
          <Fieldset.Group>
            <FieldRow className="grid-cols-2">
              <FormSelectField
                control={control}
                label="Mechanics"
                name="mechanics"
                placeholder="Select…"
              >
                {MECHANICS_OPTIONS.map((option) => (
                  <ListBox.Item
                    id={option.value}
                    key={option.value}
                    textValue={option.label}
                  >
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </FormSelectField>

              <FormSelectField
                control={control}
                label="Force"
                name="force"
                placeholder="Select…"
              >
                {FORCE_OPTIONS.map((option) => (
                  <ListBox.Item
                    id={option.value}
                    key={option.value}
                    textValue={option.label}
                  >
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </FormSelectField>
            </FieldRow>

            {muscles.length > 0 && (
              <Controller
                control={control}
                name="muscle_ids"
                render={({field, fieldState}) => (
                  <MultiSelectAutocomplete
                    emptyMessage="No muscles found"
                    errorMessage={fieldState.error?.message}
                    isInvalid={!!fieldState.error}
                    items={muscles}
                    label="Muscles"
                    name={field.name}
                    onChange={field.onChange}
                    placeholder="Search and select muscles"
                    searchPlaceholder="Search muscles..."
                    value={field.value ?? []}
                  />
                )}
              />
            )}

            {equipment.length > 0 && (
              <Controller
                control={control}
                name="equipment_ids"
                render={({field, fieldState}) => (
                  <MultiSelectAutocomplete
                    emptyMessage="No equipment found"
                    errorMessage={fieldState.error?.message}
                    isInvalid={!!fieldState.error}
                    items={equipment}
                    label="Equipment"
                    name={field.name}
                    onChange={field.onChange}
                    placeholder="Search and select equipment"
                    searchPlaceholder="Search equipment..."
                    value={field.value ?? []}
                  />
                )}
              />
            )}
          </Fieldset.Group>
        </Fieldset>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting || mediaBusy}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
