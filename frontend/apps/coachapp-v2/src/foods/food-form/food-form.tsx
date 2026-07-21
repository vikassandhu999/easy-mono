import {Description, ErrorMessage, Fieldset, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
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
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-classes';
import LibraryMediaField, {type LibraryMediaValue} from '@/@components/library-media-field';
import {ServingSizesEditor} from '@/@components/serving-sizes-editor';
import type {Food, FoodRequest, FoodUpdateRequest} from '@/api/generated';
import {omitUndefined, type ServingSize, toOptionalText} from '@/api/shared';

export const foodFormSchema = z.object({
  name: z.string().min(1, 'Enter food name'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
  media_id: z.string().nullable().optional(),
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
  media_id: null,
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
    source: food.source ?? 'custom',
    notes: food.notes ?? '',
    image_url: food.image_url ?? '',
    media_id: food.media?.id ?? null,
    calories_per_100g: food.calories_per_100g ?? undefined,
    protein_g: food.protein_g_per_100g ?? undefined,
    carbs_g: food.carbs_g_per_100g ?? undefined,
    fats_g: food.fat_g_per_100g ?? undefined,
    fiber_g: food.fiber_g_per_100g ?? undefined,
    sugar_g: undefined,
  };
}

export function foodToMediaValue(food: Food): LibraryMediaValue | null {
  return food.media ? {contentType: food.media.content_type, kind: food.media.kind, url: food.media.url} : null;
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
    media_id: values.media_id ?? undefined,
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
    media_id: values.media_id ?? null,
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
  initialMedia?: LibraryMediaValue | null;
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
  initialMedia,
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
  } = form;

  const [mediaBusy, setMediaBusy] = useState(false);

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div className={RESPONSIVE_FORM_SECTION_CLASS}>
        <Fieldset>
          <Fieldset.Legend className="hidden sm:block">Details</Fieldset.Legend>
          <Description className="hidden sm:block">Name the food and where it came from.</Description>
          <Fieldset.Group>
            <LibraryMediaField
              initialMedia={initialMedia}
              onBusyChange={setMediaBusy}
              onChange={(mediaId) => setValue('media_id', mediaId, {shouldDirty: true})}
            />
            <Description className="text-muted">
              Uploads are public by URL. Don't upload client photos or private material.
            </Description>

            {/* Mobile-only Details header: the real legend above is sm+; on
                mobile Images lead and this takes its place (FE-mobile ref). */}
            <div className="border-t border-separator pt-5 sm:hidden">
              <Typography weight="semibold">Details</Typography>
            </div>

            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Greek Yogurt, 2%'}}
              isRequired
              label="Name"
              name="name"
            />

            <FieldRow className="grid-cols-2">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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

          <ServingSizesEditor
            onChange={onServingSizesChange}
            value={servingSizes}
          />
        </Fieldset>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting || mediaBusy}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
