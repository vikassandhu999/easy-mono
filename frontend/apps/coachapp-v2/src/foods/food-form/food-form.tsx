import {
  Button,
  CloseButton,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Input,
  Label,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ImagePlus, Plus, X} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {
  FieldRow,
  FormActions,
  FormLayout,
  FormNumberField,
  FormTextAreaField,
  FormTextField,
} from '@/@components/form-fields';
import {NumberInput} from '@/@components/number-input';
import type {Food, FoodRequest, FoodUpdateRequest} from '@/api/generated';
import {omitUndefined, type ServingSize, toOptionalText} from '@/api/shared';

export const foodFormSchema = z.object({
  name: z.string().min(1, 'Enter food name'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
  calories_per_100g: z.number().min(0, 'Use 0 or higher').optional(),
  protein_g: z.number().min(0, 'Use 0 or higher').optional(),
  carbs_g: z.number().min(0, 'Use 0 or higher').optional(),
  fats_g: z.number().min(0, 'Use 0 or higher').optional(),
  fiber_g: z.number().min(0, 'Use 0 or higher').optional(),
  sugar_g: z.number().min(0, 'Use 0 or higher').optional(),
});

export type FoodFormValues = z.infer<typeof foodFormSchema>;

export const FOOD_FORM_DEFAULTS: FoodFormValues = {
  name: '',
  category: '',
  source: '',
  notes: '',
  image_url: '',
  calories_per_100g: undefined,
  protein_g: undefined,
  carbs_g: undefined,
  fats_g: undefined,
  fiber_g: undefined,
  sugar_g: undefined,
};

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    category: food.category ?? '',
    source: food.source ?? '',
    notes: food.notes ?? '',
    image_url: food.image_url ?? '',
    calories_per_100g: food.calories_per_100g ?? undefined,
    protein_g: food.protein_g_per_100g ?? undefined,
    carbs_g: food.carbs_g_per_100g ?? undefined,
    fats_g: food.fat_g_per_100g ?? undefined,
    fiber_g: food.fiber_g_per_100g ?? undefined,
    sugar_g: undefined,
  };
}

export function foodToDuplicateFormValues(food: Food): FoodFormValues {
  return {
    ...foodToFormValues(food),
    name: `${food.name} (copy)`,
    source: '',
  };
}

function toFoodServingSizes(sizes: ServingSize[]): import('@/api/generated').FoodServingSize[] {
  return sizes.map((s) => ({
    unit: s.unit,
    amount: s.amount ?? 1,
    weight_g: s.weight_g ?? 0,
    is_default: false,
    label: s.unit,
  }));
}

export function foodToCreateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source) as FoodRequest['source'],
    notes: toOptionalText(values.notes),
    image_url: toOptionalText(values.image_url),
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    serving_sizes: servingSizes.length > 0 ? toFoodServingSizes(servingSizes) : undefined,
  });
}

export function foodToUpdateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodUpdateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source) as FoodUpdateRequest['source'],
    notes: toOptionalText(values.notes),
    image_url: toOptionalText(values.image_url),
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    serving_sizes: servingSizes.length > 0 ? toFoodServingSizes(servingSizes) : undefined,
  });
}

export function useFoodForm(options?: {defaultValues?: FoodFormValues; values?: FoodFormValues}) {
  return useForm<FoodFormValues>({
    defaultValues: options?.values ? undefined : (options?.defaultValues ?? FOOD_FORM_DEFAULTS),
    resolver: zodResolver(foodFormSchema),
    values: options?.values,
  });
}

type FoodFormProps = {
  form: ReturnType<typeof useFoodForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onServingSizesChange: (sizes: ServingSize[]) => void;
  onSubmit: (data: FoodFormValues) => void;
  servingSizes: ServingSize[];
  submitLabel: string;
  submittingLabel: string;
};

type MacroFieldName = 'calories_per_100g' | 'carbs_g' | 'fats_g' | 'fiber_g' | 'protein_g' | 'sugar_g';

const MACRO_FIELDS: {label: string; name: MacroFieldName}[] = [
  {label: 'Calories', name: 'calories_per_100g'},
  {label: 'Protein (g)', name: 'protein_g'},
  {label: 'Carbs (g)', name: 'carbs_g'},
  {label: 'Fat (g)', name: 'fats_g'},
  {label: 'Fiber (g)', name: 'fiber_g'},
  {label: 'Sugar (g)', name: 'sugar_g'},
];

export default function FoodForm({
  form,
  isSubmitting,
  onCancel,
  onServingSizesChange,
  onSubmit,
  servingSizes,
  submitLabel,
  submittingLabel,
}: FoodFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    setValue,
    watch,
  } = form;

  const imageUrl = watch('image_url');

  const [isAddingServing, setIsAddingServing] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newAmount, setNewAmount] = useState<number | undefined>();
  const [newWeightG, setNewWeightG] = useState<number | undefined>();
  const [servingError, setServingError] = useState('');

  const [isAddingImage, setIsAddingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageError, setImageError] = useState('');

  const resetServingForm = useCallback(() => {
    setNewUnit('');
    setNewAmount(undefined);
    setNewWeightG(undefined);
    setServingError('');
  }, []);

  const handleAddServing = useCallback(() => {
    const unit = newUnit.trim();
    if (!unit) {
      setServingError('Enter a serving unit');
      return;
    }
    const amount = newAmount ?? null;
    const weightG = newWeightG ?? null;
    const serving: ServingSize = {unit, amount, weight_g: weightG};
    onServingSizesChange([...servingSizes, serving]);
    resetServingForm();
    setIsAddingServing(false);
  }, [newUnit, newAmount, newWeightG, servingSizes, onServingSizesChange, resetServingForm]);

  const handleRemoveServing = useCallback(
    (index: number) => {
      onServingSizesChange(servingSizes.filter((_, i) => i !== index));
    },
    [servingSizes, onServingSizesChange],
  );

  const handleAddImage = useCallback(() => {
    const url = newImageUrl.trim();
    if (!url) {
      setImageError('Paste an image URL');
      return;
    }
    setValue('image_url', url, {shouldDirty: true});
    setNewImageUrl('');
    setImageError('');
    setIsAddingImage(false);
  }, [newImageUrl, setValue]);

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <Fieldset>
          <Fieldset.Legend>Details</Fieldset.Legend>
          <Description>Name the food and where it came from.</Description>
          <Fieldset.Group>
            <div>
              <Label>Images</Label>
              <div className="mt-2 flex flex-wrap items-start gap-3">
                {imageUrl ? (
                  <div className="relative">
                    <img
                      alt="Food"
                      className="size-20 rounded-xl border border-border bg-surface-secondary object-cover"
                      src={imageUrl}
                    />
                    <CloseButton
                      aria-label="Remove image"
                      className="absolute -top-2 -right-2 rounded-full bg-ink text-ink-foreground"
                      onPress={() => setValue('image_url', '', {shouldDirty: true})}
                    />
                  </div>
                ) : isAddingImage ? (
                  <div className="flex w-full flex-wrap items-end gap-2">
                    <TextField
                      className="min-w-0 flex-1"
                      isInvalid={!!imageError}
                    >
                      <Label>Add image URL</Label>
                      {imageError && <FieldError>{imageError}</FieldError>}
                      <Input
                        onChange={(e) => {
                          setNewImageUrl(e.target.value);
                          setImageError('');
                        }}
                        placeholder="https://…"
                        value={newImageUrl}
                      />
                    </TextField>
                    <Button
                      onPress={handleAddImage}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
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
                    aria-label="Add image URL"
                    className="size-20 flex-col gap-1 rounded-xl border border-dashed border-border text-muted"
                    onPress={() => setIsAddingImage(true)}
                    variant="ghost"
                  >
                    <ImagePlus className="size-5" />
                    <span className="text-xs">Add</span>
                  </Button>
                )}
              </div>
            </div>

            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Greek Yogurt, 2%'}}
              isRequired
              label="Name"
              name="name"
            />

            <FieldRow>
              <FormTextField
                control={control}
                fullWidth
                inputProps={{placeholder: 'e.g. Dairy'}}
                label="Category"
                name="category"
              />
              <FormTextField
                control={control}
                fullWidth
                inputProps={{placeholder: 'e.g. USDA'}}
                label="Source"
                name="source"
              />
            </FieldRow>

            <FormTextAreaField
              control={control}
              fullWidth
              label="Notes"
              name="notes"
              textAreaProps={{placeholder: 'Prep notes, brand, or anything worth remembering…', rows: 3}}
            />
          </Fieldset.Group>
        </Fieldset>

        <div className="my-6 border-t border-separator" />

        <Fieldset>
          <Fieldset.Legend>Nutrition</Fieldset.Legend>
          <Description>Enter values per 100 g.</Description>
          <Fieldset.Group>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {MACRO_FIELDS.map((fieldConfig) => (
                <FormNumberField
                  control={control}
                  fullWidth
                  key={fieldConfig.name}
                  label={fieldConfig.label}
                  minValue={0}
                  name={fieldConfig.name}
                />
              ))}
            </div>
          </Fieldset.Group>
        </Fieldset>

        <div className="my-6 border-t border-separator" />

        <Fieldset>
          <Fieldset.Legend>Serving sizes</Fieldset.Legend>
          <Description>Optional presets clients can log against.</Description>

          <Fieldset.Group>
            {servingSizes.map((serving, i) => (
              <div
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5"
                key={i}
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <Typography
                    type="body-sm"
                    weight="semibold"
                  >
                    {serving.amount ?? 1} {serving.unit}
                  </Typography>
                  {serving.weight_g != null && serving.weight_g > 0 && (
                    <Typography
                      color="muted"
                      type="body-sm"
                    >
                      {serving.weight_g} g
                    </Typography>
                  )}
                </div>
                <Button
                  aria-label={`Remove ${serving.unit}`}
                  onPress={() => handleRemoveServing(i)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}

            {isAddingServing ? (
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    fullWidth
                    isInvalid={!!servingError}
                    isRequired
                  >
                    <Label>Unit</Label>
                    {servingError && <FieldError>{servingError}</FieldError>}
                    <Input
                      onChange={(e) => {
                        setNewUnit(e.target.value);
                        setServingError('');
                      }}
                      placeholder="e.g. scoop, cup"
                      value={newUnit}
                    />
                  </TextField>
                  <NumberInput
                    fullWidth
                    label="Amount"
                    minValue={0}
                    onChange={setNewAmount}
                    value={newAmount}
                  />
                  <NumberInput
                    fullWidth
                    label="Weight (g)"
                    minValue={0}
                    onChange={setNewWeightG}
                    value={newWeightG}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onPress={handleAddServing}
                    size="sm"
                  >
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                  <Button
                    onPress={() => {
                      setIsAddingServing(false);
                      resetServingForm();
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full rounded-xl border border-dashed border-border text-muted"
                onPress={() => setIsAddingServing(true)}
                variant="ghost"
              >
                <Plus className="size-4" />
                Add serving size
              </Button>
            )}
          </Fieldset.Group>
        </Fieldset>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <div className="sticky bottom-0 -my-2 bg-background py-2 sm:static sm:my-0 sm:bg-transparent sm:py-0">
        <FormActions
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          submitLabel={submitLabel}
          submittingLabel={submittingLabel}
        />
      </div>
    </FormLayout>
  );
}
