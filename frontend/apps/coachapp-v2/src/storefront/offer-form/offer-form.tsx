import {
  Button,
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
  Switch,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';

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
                <Description>Use a clear program or service name</Description>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="type"
            render={({field}) => (
              <Select
                isInvalid={!!errors.type}
                onSelectionChange={(key) => field.onChange(key || undefined)}
                selectedKey={field.value || null}
              >
                <Label>Type (optional)</Label>
                {errors.type && <FieldError>{errors.type.message}</FieldError>}
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
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
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />

          <Fieldset.Group>
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
                  <Description>Example: 8 weeks</Description>
                  {errors.duration_text && <FieldError>{errors.duration_text.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="price_display"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.price_display}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Price display (optional)</Label>
                  <Description>Example: ₹4,999</Description>
                  {errors.price_display && <FieldError>{errors.price_display.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>

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
                <Description>Explain who it is for and what clients get</Description>
                {errors.description && <FieldError>{errors.description.message}</FieldError>}
                <TextArea rows={3} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Features</Fieldset.Legend>
        <Description>Add short benefits that will appear on the offer card</Description>

        <Fieldset.Group>
          {fields.map((field, index) => (
            <Fieldset.Group key={field.id}>
              <Controller
                control={control}
                name={`features.${index}.value`}
                render={({field: featureField}) => (
                  <TextField
                    fullWidth
                    isInvalid={!!errors.features?.[index]?.value}
                    name={featureField.name}
                    onBlur={featureField.onBlur}
                    onChange={featureField.onChange}
                    value={featureField.value}
                  >
                    <Label>Feature {index + 1}</Label>
                    {errors.features?.[index]?.value && (
                      <FieldError>{errors.features[index]?.value?.message}</FieldError>
                    )}
                    <Input />
                  </TextField>
                )}
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
          <Controller
            control={control}
            name="cta_text"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.cta_text}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Button text (optional)</Label>
                <Description>Example: Get started</Description>
                {errors.cta_text && <FieldError>{errors.cta_text.message}</FieldError>}
                <Input />
              </TextField>
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
                  <Typography type="body-sm">Feature this offer</Typography>
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
