import {Button, Description, ErrorMessage, Fieldset, Form, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Star} from 'lucide-react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';
import {FormNumberField, FormSwitchField, FormTextAreaField, FormTextField} from '@/@components/form-fields';

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
          <FormTextField
            control={control}
            fullWidth
            isRequired
            label="Client name (required)"
            name="client_name"
          />

          <FormTextField
            control={control}
            fullWidth
            label="Instagram handle (optional)"
            name="client_handle"
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Transformation photos</Fieldset.Legend>
        <Description>Add optional before and after photos</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            label="Before photo URL (optional)"
            name="before_image_url"
            type="url"
          />

          <FormTextField
            control={control}
            fullWidth
            label="After photo URL (optional)"
            name="after_image_url"
            type="url"
          />

          <FormNumberField
            control={control}
            fullWidth
            label="Before weight, kg (optional)"
            minValue={0}
            name="before_weight"
            onFieldBlur={suggestResultTag}
          />

          <FormNumberField
            control={control}
            fullWidth
            label="After weight, kg (optional)"
            minValue={0}
            name="after_weight"
            onFieldBlur={suggestResultTag}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Result details</Fieldset.Legend>
        <Description>Add the headline, program, and timeline shown on your storefront</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            description="Example: Lost 15kg or gained muscle"
            fullWidth
            label="Result headline (optional)"
            name="result_tag"
          />

          <FormTextField
            control={control}
            fullWidth
            label="Program name (optional)"
            name="program_name"
          />

          <FormTextField
            control={control}
            description="Example: 12 weeks"
            fullWidth
            label="Duration (optional)"
            name="duration_text"
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Testimonial text</Fieldset.Legend>
        <Description>Add the quote, rating, and featured status</Description>

        <Fieldset.Group>
          <FormTextAreaField
            control={control}
            fullWidth
            label="Quote (optional)"
            name="quote"
            textAreaProps={{rows: 4}}
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

          <FormSwitchField
            control={control}
            label={<Typography type="body-sm">Feature this testimonial</Typography>}
            name="is_featured"
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
