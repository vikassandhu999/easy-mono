import {Button, Input, Label, Spinner, Switch, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Star} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

const testimonialFormSchema = z.object({
  after_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  after_weight: z.union([z.number().positive('Must be positive'), z.nan(), z.literal('')]).optional(),
  before_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  before_weight: z.union([z.number().positive('Must be positive'), z.nan(), z.literal('')]).optional(),
  client_handle: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
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
  after_weight: '',
  before_image_url: '',
  before_weight: '',
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

export default function TestimonialForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: {
  form: ReturnType<typeof useTestimonialForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: TestimonialFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
}) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
    setValue,
    watch,
  } = form;

  const beforeWeight = watch('before_weight');
  const afterWeight = watch('after_weight');
  const resultTag = watch('result_tag');

  // Auto-suggest result tag from weights
  const suggestResultTag = () => {
    if (resultTag) return; // Don't overwrite existing
    const bw = typeof beforeWeight === 'number' ? beforeWeight : NaN;
    const aw = typeof afterWeight === 'number' ? afterWeight : NaN;
    if (!isNaN(bw) && !isNaN(aw) && bw > 0 && aw > 0) {
      const diff = Math.round(Math.abs(bw - aw));
      if (aw < bw) {
        setValue('result_tag', `Lost ${diff}kg`);
      } else if (aw > bw) {
        setValue('result_tag', `Gained ${diff}kg`);
      }
    }
  };

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Client details</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client_name">Client name *</Label>
          <Input
            id="client_name"
            placeholder="Vikas"
            {...register('client_name')}
          />
          {errors.client_name && <p className="text-xs text-danger">{errors.client_name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client_handle">Instagram handle</Label>
          <Input
            id="client_handle"
            placeholder="@vikas_fitness"
            {...register('client_handle')}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Transformation photos</legend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="before_image_url">Before photo URL</Label>
            <Input
              id="before_image_url"
              placeholder="https://cdn.example.com/before.jpg"
              type="url"
              {...register('before_image_url')}
            />
            {errors.before_image_url && <p className="text-xs text-danger">{errors.before_image_url.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="after_image_url">After photo URL</Label>
            <Input
              id="after_image_url"
              placeholder="https://cdn.example.com/after.jpg"
              type="url"
              {...register('after_image_url')}
            />
            {errors.after_image_url && <p className="text-xs text-danger">{errors.after_image_url.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="before_weight">Before weight (kg)</Label>
            <Input
              id="before_weight"
              placeholder="95"
              type="number"
              {...register('before_weight', {
                onBlur: suggestResultTag,
                valueAsNumber: true,
              })}
            />
            {errors.before_weight && <p className="text-xs text-danger">{errors.before_weight.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="after_weight">After weight (kg)</Label>
            <Input
              id="after_weight"
              placeholder="80"
              type="number"
              {...register('after_weight', {
                onBlur: suggestResultTag,
                valueAsNumber: true,
              })}
            />
            {errors.after_weight && <p className="text-xs text-danger">{errors.after_weight.message}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Result details</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="result_tag">Result headline</Label>
          <Input
            id="result_tag"
            placeholder="Lost 15kg"
            {...register('result_tag')}
          />
          <p className="text-xs text-foreground-400">
            Short label: &ldquo;Lost 15kg&rdquo;, &ldquo;Gained muscle&rdquo;, etc.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="program_name">Program name</Label>
          <Input
            id="program_name"
            placeholder="Fat Loss Program"
            {...register('program_name')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration_text">Duration</Label>
          <Input
            id="duration_text"
            placeholder="12 weeks"
            {...register('duration_text')}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">Testimonial text</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quote">Quote</Label>
          <TextArea
            id="quote"
            placeholder="Coach completely changed my approach to food..."
            rows={4}
            {...register('quote')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Rating (optional)</Label>
          <Controller
            control={control}
            name="rating"
            render={({field}) => (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
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
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="is_featured"
            render={({field}) => (
              <Switch
                isSelected={field.value}
                onChange={field.onChange}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content>
                  <span className="text-sm">Feature this testimonial</span>
                </Switch.Content>
              </Switch>
            )}
          />
        </div>
      </fieldset>

      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
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
      </div>
    </form>
  );
}
