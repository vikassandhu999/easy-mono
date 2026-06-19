import {Button, Description, ErrorMessage, Fieldset, Form, ListBox, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormSelectField, FormSwitchField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {Offer, OfferCreateRequest, OfferType} from '@/api/offers';
import {omitUndefined, toOptionalText} from '@/api/shared';

const offerFormSchema = z.object({
  cta_text: z.string().optional(),
  description: z.string().max(5000, 'Use 5000 characters or fewer').optional(),
  duration_text: z.string().optional(),
  features: z.array(z.object({value: z.string().min(1, 'Enter feature')})),
  is_featured: z.boolean(),
  name: z.string().min(1, 'Enter offer name').max(255, 'Use 255 characters or fewer'),
  price_display: z.string().optional(),
  type: z.enum(['nutrition_plan', 'training_plan', 'combo', 'consultation', 'other']).optional(),
});

export type OfferFormValues = z.infer<typeof offerFormSchema>;

const OFFER_FORM_DEFAULTS: OfferFormValues = {
  cta_text: '',
  description: '',
  duration_text: '',
  features: [],
  is_featured: false,
  name: '',
  price_display: '',
  type: undefined,
};

const OFFER_TYPES = [
  {label: 'Nutrition plan', value: 'nutrition_plan'},
  {label: 'Training plan', value: 'training_plan'},
  {label: 'Combo', value: 'combo'},
  {label: 'Consultation', value: 'consultation'},
  {label: 'Other', value: 'other'},
] as const;

export function useOfferForm(options?: {values?: OfferFormValues}) {
  return useForm<OfferFormValues>({
    defaultValues: options?.values ? undefined : OFFER_FORM_DEFAULTS,
    resolver: zodResolver(offerFormSchema),
    values: options?.values,
  });
}

export function featuresToFormValues(features: string[]): OfferFormValues['features'] {
  return features.map((feature) => ({value: feature}));
}

export function formValuesToFeatures(features: OfferFormValues['features']): string[] {
  return features.map((feature) => feature.value).filter(Boolean);
}

export function offerToFormValues(offer: Offer): OfferFormValues {
  return {
    cta_text: offer.cta_text ?? '',
    description: offer.description ?? '',
    duration_text: offer.duration_text ?? '',
    features: featuresToFormValues(offer.features ?? []),
    is_featured: offer.is_featured,
    name: offer.name,
    price_display: offer.price_display ?? '',
    type: offer.type ?? undefined,
  };
}

export function offerToRequest(values: OfferFormValues): OfferCreateRequest {
  const features = formValuesToFeatures(values.features);
  return omitUndefined({
    cta_text: toOptionalText(values.cta_text),
    description: toOptionalText(values.description),
    duration_text: toOptionalText(values.duration_text),
    features: features.length > 0 ? features : undefined,
    is_featured: values.is_featured,
    name: values.name,
    price_display: toOptionalText(values.price_display),
    type: values.type as OfferType | undefined,
  });
}

type OfferFormProps = {
  form: ReturnType<typeof useOfferForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: OfferFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function OfferForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: OfferFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  const {append, fields, remove} = useFieldArray({control, name: 'features'});

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Offer details</Fieldset.Legend>
        <Description>Describe what clients can buy from your storefront</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            description="Use a clear program or service name"
            fullWidth
            isRequired
            label="Name (required)"
            name="name"
          />

          <FormSelectField
            control={control}
            label="Type (optional)"
            name="type"
          >
            {OFFER_TYPES.map((option) => (
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

          <Fieldset.Group>
            <FormTextField
              control={control}
              description="Example: 8 weeks"
              fullWidth
              label="Duration (optional)"
              name="duration_text"
            />
            <FormTextField
              control={control}
              description="Example: ₹4,999"
              fullWidth
              label="Price display (optional)"
              name="price_display"
            />
          </Fieldset.Group>

          <FormTextAreaField
            control={control}
            description="Explain who it is for and what clients get"
            fullWidth
            label="Description (optional)"
            name="description"
            textAreaProps={{rows: 3}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Features</Fieldset.Legend>
        <Description>Add short benefits that will appear on the offer card</Description>

        <Fieldset.Group>
          {fields.map((field, index) => (
            <Fieldset.Group key={field.id}>
              <FormTextField
                control={control}
                fullWidth
                label={`Feature ${index + 1}`}
                name={`features.${index}.value`}
              />
              <Fieldset.Actions>
                <Button
                  aria-label={`Remove feature ${index + 1}`}
                  onPress={() => remove(index)}
                  size="sm"
                  variant="ghost"
                >
                  <X size={14} />
                </Button>
              </Fieldset.Actions>
            </Fieldset.Group>
          ))}

          <Button
            onPress={() => append({value: ''})}
            size="sm"
            variant="ghost"
          >
            <Plus size={14} />
            Add feature
          </Button>
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Call to action</Fieldset.Legend>
        <Fieldset.Group>
          <FormTextField
            control={control}
            description="Example: Get started"
            fullWidth
            label="Button text (optional)"
            name="cta_text"
          />

          <FormSwitchField
            control={control}
            label={<Typography type="body-sm">Feature this offer</Typography>}
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
