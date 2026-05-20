import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  NumberField,
  Spinner,
  Switch,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Star} from 'lucide-react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

const optionalUrl = z.string().url('Enter a valid URL').optional().or(z.literal(''));
const optionalPositiveNumber = z.number().positive('Use a number above 0').optional();

const testimonialFormSchema = z.object({
  after_image_url: optionalUrl,
  after_weight: optionalPositiveNumber,
  before_image_url: optionalUrl,
  before_weight: optionalPositiveNumber,
  client_handle: z.string().optional(),
  client_name: z.string().min(1, 'Enter client name'),
  duration_text: z.string().optional(),
  is_featured: z.boolean(),
  program_name: z.string().optional(),
  quote: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  result_tag: z.string().optional(),
});

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;

const TESTIMONIAL_FORM_DEFAULTS: TestimonialFormValues = {
  after_image_url: '',
  after_weight: undefined,
  before_image_url: '',
  before_weight: undefined,
  client_handle: '',
  client_name: '',
  duration_text: '',
  is_featured: false,
  program_name: '',
  quote: '',
  rating: undefined,
  result_tag: '',
};

export function useTestimonialForm(options?: {values?: TestimonialFormValues}) {
  return useForm<TestimonialFormValues>({
    defaultValues: options?.values ? undefined : TESTIMONIAL_FORM_DEFAULTS,
    resolver: zodResolver(testimonialFormSchema),
    values: options?.values,
  });
}

type TestimonialFormProps = {
  form: ReturnType<typeof useTestimonialForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: TestimonialFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function TestimonialForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: TestimonialFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    setValue,
  } = form;

  const beforeWeight = useWatch({control, name: 'before_weight'});
  const afterWeight = useWatch({control, name: 'after_weight'});
  const resultTag = useWatch({control, name: 'result_tag'});

  const suggestResultTag = () => {
    if (resultTag || !beforeWeight || !afterWeight) {
      return;
    }

    const diff = Math.round(Math.abs(beforeWeight - afterWeight));
    if (afterWeight < beforeWeight) {
      setValue('result_tag', `Lost ${diff}kg`, {shouldDirty: true});
    } else if (afterWeight > beforeWeight) {
      setValue('result_tag', `Gained ${diff}kg`, {shouldDirty: true});
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Client details</Fieldset.Legend>
        <Description>Add the client name and optional public handle</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="client_name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.client_name}
                isRequired
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Client name (required)</Label>
                {errors.client_name && <FieldError>{errors.client_name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="client_handle"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.client_handle}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Instagram handle (optional)</Label>
                {errors.client_handle && <FieldError>{errors.client_handle.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Transformation photos</Fieldset.Legend>
        <Description>Add optional before and after photos</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="before_image_url"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.before_image_url}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="url"
                value={field.value ?? ''}
              >
                <Label>Before photo URL (optional)</Label>
                {errors.before_image_url && <FieldError>{errors.before_image_url.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="after_image_url"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.after_image_url}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="url"
                value={field.value ?? ''}
              >
                <Label>After photo URL (optional)</Label>
                {errors.after_image_url && <FieldError>{errors.after_image_url.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="before_weight"
            render={({field}) => (
              <NumberField
                fullWidth
                isInvalid={!!errors.before_weight}
                minValue={0}
                name={field.name}
                onBlur={() => {
                  field.onBlur();
                  suggestResultTag();
                }}
                onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
                value={field.value}
              >
                <Label>Before weight, kg (optional)</Label>
                {errors.before_weight && <FieldError>{errors.before_weight.message}</FieldError>}
                <NumberField.Group>
                  <NumberField.Input />
                </NumberField.Group>
              </NumberField>
            )}
          />

          <Controller
            control={control}
            name="after_weight"
            render={({field}) => (
              <NumberField
                fullWidth
                isInvalid={!!errors.after_weight}
                minValue={0}
                name={field.name}
                onBlur={() => {
                  field.onBlur();
                  suggestResultTag();
                }}
                onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
                value={field.value}
              >
                <Label>After weight, kg (optional)</Label>
                {errors.after_weight && <FieldError>{errors.after_weight.message}</FieldError>}
                <NumberField.Group>
                  <NumberField.Input />
                </NumberField.Group>
              </NumberField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Result details</Fieldset.Legend>
        <Description>Add the headline, program, and timeline shown on your storefront</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="result_tag"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.result_tag}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Result headline (optional)</Label>
                <Description>Example: Lost 15kg or gained muscle</Description>
                {errors.result_tag && <FieldError>{errors.result_tag.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="program_name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.program_name}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Program name (optional)</Label>
                {errors.program_name && <FieldError>{errors.program_name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="duration_text"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.duration_text}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Duration (optional)</Label>
                <Description>Example: 12 weeks</Description>
                {errors.duration_text && <FieldError>{errors.duration_text.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Testimonial text</Fieldset.Legend>
        <Description>Add the quote, rating, and featured status</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="quote"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.quote}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Quote (optional)</Label>
                {errors.quote && <FieldError>{errors.quote.message}</FieldError>}
                <TextArea rows={4} />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="rating"
            render={({field}) => (
              <Fieldset>
                <Fieldset.Legend>Rating (optional)</Fieldset.Legend>
                <Fieldset.Actions>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      aria-label={`Set rating to ${star}`}
                      className="min-h-11 min-w-11 rounded-lg p-2 transition-colors hover:bg-default-100 active:bg-default-200"
                      isIconOnly
                      key={star}
                      onPress={() => field.onChange(field.value === star ? undefined : star)}
                      size="sm"
                      variant="ghost"
                    >
                      <Star
                        className={
                          field.value && star <= field.value ? 'fill-warning text-warning' : 'text-foreground-300'
                        }
                        size={20}
                      />
                    </Button>
                  ))}
                </Fieldset.Actions>
              </Fieldset>
            )}
          />

          <Controller
            control={control}
            name="is_featured"
            render={({field}) => (
              <Switch
                isSelected={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content>
                  <Typography type="body-sm">Feature this testimonial</Typography>
                </Switch.Content>
              </Switch>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
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
      </Fieldset.Actions>
    </Form>
  );
}
