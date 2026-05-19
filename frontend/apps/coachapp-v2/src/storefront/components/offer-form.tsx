import {Button, Input, Label, ListBox, Select, Spinner, Switch, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {useState} from 'react';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';

const offerFormSchema = z.object({
  cta_text: z.string().optional(),
  description: z.string().max(5000, 'Maximum 5000 characters').optional(),
  duration_text: z.string().optional(),
  features: z.array(z.object({value: z.string().min(1)})),
  is_featured: z.boolean(),
  name: z.string().min(1, 'Name is required').max(255, 'Maximum 255 characters'),
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
  {label: 'Nutrition Plan', value: 'nutrition_plan'},
  {label: 'Training Plan', value: 'training_plan'},
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
  return features.map((f) => ({value: f}));
}

export function formValuesToFeatures(features: OfferFormValues['features']): string[] {
  return features.map((f) => f.value).filter(Boolean);
}

export default function OfferForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: {
  form: ReturnType<typeof useOfferForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: OfferFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
}) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  const {append, fields, remove} = useFieldArray({control, name: 'features'});

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="Fat Loss Program"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Controller
          control={control}
          name="type"
          render={({field}) => (
            <Select
              onSelectionChange={(key) => field.onChange(key || undefined)}
              placeholder="Select type"
              selectedKey={field.value || null}
            >
              <Label>Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {OFFER_TYPES.map((opt) => (
                    <ListBox.Item
                      id={opt.value}
                      key={opt.value}
                      textValue={opt.label}
                    >
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        />
        {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="duration_text">Duration</Label>
        <Input
          id="duration_text"
          placeholder="8 weeks"
          {...register('duration_text')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="price_display">Price display</Label>
        <Input
          id="price_display"
          placeholder="₹4,999"
          {...register('price_display')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <TextArea
          id="description"
          placeholder="Comprehensive fat loss program with custom meal plans..."
          rows={3}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Features</Label>
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              className="flex items-center gap-2"
              key={field.id}
            >
              <Input
                className="flex-1"
                placeholder="Feature description"
                {...register(`features.${index}.value`)}
              />
              <Button
                isIconOnly
                onPress={() => remove(index)}
                size="sm"
                variant="ghost"
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
        <FeatureAdder onAdd={(value) => append({value})} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cta_text">CTA button text</Label>
        <Input
          id="cta_text"
          placeholder="Get started"
          {...register('cta_text')}
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
                <span className="text-sm">Feature this offer</span>
              </Switch.Content>
            </Switch>
          )}
        />
      </div>

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

function FeatureAdder({onAdd}: {onAdd: (value: string) => void}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Add feature..."
        value={value}
      />
      <Button
        isDisabled={!value.trim()}
        onPress={handleAdd}
        size="sm"
        variant="ghost"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
