import {
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ImageOff, Plus, X} from 'lucide-react';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import {type Equipment, type ExerciseForce, type ExerciseMechanics, type Muscle} from '@/api/exercises';

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

type ExerciseFormProps = {
  equipment: Equipment[];
  form: ReturnType<typeof useExerciseForm>;
  isSubmitting: boolean;
  muscles: Muscle[];
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
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Exercise details</Fieldset.Legend>
        <Description>Name the exercise and add coaching instructions</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.name}
                isRequired
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Name (required)</Label>
                <Description>Use the name coaches and clients will recognize</Description>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.description}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Description (optional)</Label>
                <Description>Summarize what this exercise is for</Description>
                {errors.description && <FieldError>{errors.description.message}</FieldError>}
                <TextArea rows={2} />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="instructions"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.instructions}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Instructions (optional)</Label>
                <Description>Add cues, setup notes, and execution steps</Description>
                {errors.instructions && <FieldError>{errors.instructions.message}</FieldError>}
                <TextArea rows={3} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Classification</Fieldset.Legend>
        <Description>Choose how this exercise should be categorized</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="mechanics"
            render={({field}) => (
              <Select
                isInvalid={!!errors.mechanics}
                onSelectionChange={(key) => field.onChange(key ?? '')}
                selectedKey={field.value || null}
              >
                <Label>Mechanics (optional)</Label>
                {errors.mechanics && <FieldError>{errors.mechanics.message}</FieldError>}
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
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
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />

          <Controller
            control={control}
            name="force"
            render={({field}) => (
              <Select
                isInvalid={!!errors.force}
                onSelectionChange={(key) => field.onChange(key ?? '')}
                selectedKey={field.value || null}
              >
                <Label>Force (optional)</Label>
                {errors.force && <FieldError>{errors.force.message}</FieldError>}
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
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
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      {muscles.length > 0 && (
        <Fieldset>
          <Fieldset.Legend>Target muscles</Fieldset.Legend>
          <Description>Select all muscles this exercise targets</Description>

          <Controller
            control={control}
            name="muscle_ids"
            render={({field}) => (
              <CheckboxGroup
                isInvalid={!!errors.muscle_ids}
                onChange={field.onChange}
                value={field.value ?? []}
              >
                {errors.muscle_ids && <FieldError>{errors.muscle_ids.message}</FieldError>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {muscles.map((muscle) => (
                    <Checkbox
                      key={muscle.id}
                      value={muscle.id}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>{muscle.name}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
            )}
          />
        </Fieldset>
      )}

      {equipment.length > 0 && (
        <Fieldset>
          <Fieldset.Legend>Equipment</Fieldset.Legend>
          <Description>Select all equipment needed</Description>

          <Controller
            control={control}
            name="equipment_ids"
            render={({field}) => (
              <CheckboxGroup
                isInvalid={!!errors.equipment_ids}
                onChange={field.onChange}
                value={field.value ?? []}
              >
                {errors.equipment_ids && <FieldError>{errors.equipment_ids.message}</FieldError>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {equipment.map((item) => (
                    <Checkbox
                      key={item.id}
                      value={item.id}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>{item.name}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
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
              <Controller
                control={control}
                name="image_url"
                render={({field}) => (
                  <TextField
                    fullWidth
                    isInvalid={!!errors.image_url}
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={(value) => {
                      field.onChange(value);
                      if (errors.image_url) {
                        form.clearErrors('image_url');
                      }
                    }}
                    type="url"
                    value={field.value ?? ''}
                  >
                    <Label>Image URL (required)</Label>
                    <Description>Paste a full URL that starts with http:// or https://</Description>
                    {errors.image_url && <FieldError>{errors.image_url.message}</FieldError>}
                    <Input />
                  </TextField>
                )}
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

      <Fieldset.Actions>
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
