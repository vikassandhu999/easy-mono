import {
  Button,
  CloseButton,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Input,
  Label,
  ListBox,
  TextField,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ImageOff, ImagePlus} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {
  FieldRow,
  FormActions,
  FormLayout,
  FormSelectField,
  FormTextAreaField,
  FormTextField,
} from '@/@components/form-fields';
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-section';
import type {
  TrainingExercise,
  TrainingExerciseCreateRequest,
  TrainingExerciseRelation,
  TrainingExerciseUpdateRequest,
} from '@/api/generated';
import {omitUndefined, toOptionalText} from '@/api/shared';
import MultiSelectAutocomplete from '@/exercises/components/multi-select-autocomplete';

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

export const exerciseFormSchema = z.object({
  description: z.string().optional(),
  equipment_ids: z.array(z.string()).optional(),
  force: z.enum(['pull', 'push', 'static']).optional().or(z.literal('')),
  image_url: z.string().optional(),
  images: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  mechanics: z.enum(['compound', 'isolation', 'isometric']).optional().or(z.literal('')),
  muscle_ids: z.array(z.string()).optional(),
  name: z.string().min(1, 'Enter exercise name'),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const EXERCISE_FORM_DEFAULTS: ExerciseFormValues = {
  description: '',
  equipment_ids: [],
  force: '',
  image_url: '',
  images: [],
  instructions: '',
  mechanics: '',
  muscle_ids: [],
  name: '',
};

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
    muscle_ids: exercise.muscles.map((item) => item.id),
    name: exercise.name,
  };
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
  };
}

type ExerciseFormProps = {
  equipment: TrainingExerciseRelation[];
  form: ReturnType<typeof useExerciseForm>;
  isSubmitting: boolean;
  muscles: TrainingExerciseRelation[];
  onCancel: () => void;
  onSubmit: (data: ExerciseFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

function ImageThumbnail({url}: {url: string}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-20 items-center justify-center rounded-xl border border-border bg-surface-secondary">
        <ImageOff className="size-5 text-muted" />
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is used only as an image fallback handler.
    <img
      alt="Exercise"
      className="size-20 rounded-xl border border-border bg-surface-secondary object-cover"
      onError={() => setFailed(true)}
      src={url}
    />
  );
}

export default function ExerciseForm({
  equipment,
  form,
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
    watch,
  } = form;

  const images = watch('images') ?? [];

  const [isAddingImage, setIsAddingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageError, setImageError] = useState('');

  const handleAddImage = useCallback(() => {
    const url = newImageUrl.trim();
    if (!url) {
      setImageError('Paste an image URL');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setImageError('Use a URL that starts with http:// or https://');
      return;
    }
    setValue('images', [...images, url], {shouldDirty: true});
    setNewImageUrl('');
    setImageError('');
    setIsAddingImage(false);
  }, [newImageUrl, images, setValue]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      setValue(
        'images',
        images.filter((_, i) => i !== index),
        {shouldDirty: true},
      );
    },
    [images, setValue],
  );

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div className={RESPONSIVE_FORM_SECTION_CLASS}>
        <Fieldset>
          <Fieldset.Legend>Details</Fieldset.Legend>
          <Description>Name the movement and describe how it's performed.</Description>
          <Fieldset.Group>
            <div>
              <Label>Images</Label>
              <div className="mt-2 flex flex-col gap-3">
                {images.length > 0 && (
                  <div className="flex flex-wrap items-start gap-3">
                    {images.map((url, index) => (
                      <div
                        className="relative"
                        key={`${url}-${index}`}
                      >
                        <ImageThumbnail url={url} />
                        <CloseButton
                          aria-label={`Remove image ${index + 1}`}
                          className="absolute -top-2 -right-2 min-h-11 min-w-11 rounded-full bg-ink text-ink-foreground  "
                          onPress={() => handleRemoveImage(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {isAddingImage ? (
                  <div className="flex w-full flex-wrap items-end gap-2">
                    <TextField
                      className="min-w-0 flex-1"
                      isInvalid={!!imageError}
                    >
                      <Label>Add image URL</Label>
                      {imageError && <FieldError>{imageError}</FieldError>}
                      <Input
                        className="min-h-11 border border-border bg-surface shadow-none "
                        onChange={(e) => {
                          setNewImageUrl(e.target.value);
                          setImageError('');
                        }}
                        placeholder="https://…"
                        type="url"
                        value={newImageUrl}
                      />
                    </TextField>
                    <Button
                      className="min-h-11 "
                      onPress={handleAddImage}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      className="min-h-11 "
                      onPress={() => {
                        setIsAddingImage(false);
                        setNewImageUrl('');
                        setImageError('');
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="min-h-11 w-full rounded-xl border border-dashed border-border text-muted "
                    onPress={() => setIsAddingImage(true)}
                    variant="ghost"
                  >
                    <ImagePlus className="size-4" />
                    Add image URL
                  </Button>
                )}
              </div>
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
            <FieldRow>
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
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
