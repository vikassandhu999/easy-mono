import {Button, Description, ErrorMessage, Fieldset, Form, ListBox, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ImageOff, Plus, X} from 'lucide-react';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormSelectField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
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
      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-content2">
        <ImageOff
          className="text-foreground-400"
          size={14}
        />
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is used only as an image fallback handler.
    <img
      alt=""
      className="size-8 shrink-0 rounded object-cover"
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
    setError,
    setValue,
    watch,
  } = form;

  const [showImageInput, setShowImageInput] = useState(false);
  const images = watch('images') ?? [];

  return (
    <Form
      onSubmit={handleSubmit(onSubmit)}
      className={'flex flex-col gap-4'}
    >
      <Fieldset>
        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            isRequired
            label="Name"
            name="name"
            variant={'secondary'}
          />

          <FormTextAreaField
            control={control}
            description="Summarize what this exercise is for"
            fullWidth
            label="Description"
            name="description"
            textAreaProps={{rows: 2}}
          />

          <FormTextAreaField
            control={control}
            description="Add cues, setup notes, and execution steps"
            fullWidth
            label="Instructions"
            name="instructions"
            textAreaProps={{rows: 3}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Group>
          <FormSelectField
            control={control}
            label="Mechanics"
            name="mechanics"
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
        </Fieldset.Group>
      </Fieldset>

      {muscles.length > 0 && (
        <Fieldset>
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
        </Fieldset>
      )}

      {equipment.length > 0 && (
        <Fieldset>
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
        </Fieldset>
      )}

      <Fieldset>
        <Fieldset.Legend>Images</Fieldset.Legend>
        <Description>Add optional image URLs that show the exercise setup or movement</Description>

        <Fieldset.Group>
          {images.length > 0 && (
            <Fieldset.Group>
              {images.map((url, index) => (
                <Fieldset.Group key={url}>
                  <div className="flex min-w-0 items-center gap-2">
                    <ImageThumbnail url={url} />
                    <Typography
                      className="min-w-0 truncate"
                      color="muted"
                      type="body-sm"
                    >
                      {url}
                    </Typography>
                  </div>
                  <Fieldset.Actions>
                    <Button
                      aria-label={`Remove image ${index + 1}`}
                      onPress={() =>
                        setValue(
                          'images',
                          images.filter((_, i) => i !== index),
                          {shouldDirty: true},
                        )
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} />
                    </Button>
                  </Fieldset.Actions>
                </Fieldset.Group>
              ))}
            </Fieldset.Group>
          )}

          {showImageInput ? (
            <Fieldset>
              <FormTextField
                control={control}
                description="Paste a full URL that starts with http:// or https://"
                fullWidth
                label="Image URL (required)"
                name="image_url"
                onValueChange={() => {
                  if (errors.image_url) {
                    form.clearErrors('image_url');
                  }
                }}
                type="url"
              />
              <Fieldset.Actions>
                <Button
                  onPress={() => {
                    const url = (watch('image_url') ?? '').trim();

                    if (!url) {
                      setError('image_url', {message: 'Enter image URL'});
                      return;
                    }

                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      setError('image_url', {message: 'Use a URL that starts with http:// or https://'});
                      return;
                    }

                    setValue('images', [...images, url], {shouldDirty: true});
                    setValue('image_url', '', {shouldDirty: true});
                    form.clearErrors('image_url');
                    setShowImageInput(false);
                  }}
                  size="sm"
                >
                  <Plus size={14} />
                  Add
                </Button>
                <Button
                  onPress={() => {
                    setShowImageInput(false);
                    setValue('image_url', '');
                    form.clearErrors('image_url');
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </Fieldset.Actions>
            </Fieldset>
          ) : (
            <Button
              onPress={() => setShowImageInput(true)}
              size="sm"
              variant="ghost"
            >
              <Plus size={14} />
              Add image URL
            </Button>
          )}
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions className={'mt-4 flex gap-4'}>
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
      </Fieldset.Actions>
    </Form>
  );
}
