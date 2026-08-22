import {Description, ErrorMessage, Fieldset, Separator, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import type {Food} from '@/api/nutrition-foods';
import type {ServingSize} from '@/api/shared';
import {FOOD_FORM_DEFAULTS, type FoodFormValues, foodFormSchema} from '@/library/foods/food-form-data';
import {ServingSizesEditor} from '@/library/foods/serving-sizes-editor';
import LibraryMediaField, {type LibraryMediaValue} from '@/library/library-media-field';
import {FieldRow} from '@/ui/field-row';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormNumberField} from '@/ui/form-number-field';
import {FormPanel} from '@/ui/form-panel';
import {FormTextAreaField} from '@/ui/form-text-area-field';
import {FormTextField} from '@/ui/form-text-field';

// `source` is server-owned provenance: the API stamps `custom` on create and never
// accepts it in a body. The form carries it for display only, in a read-only field.
const SOURCE_LABELS: Record<NonNullable<Food['source']>, string> = {
  custom: 'Custom',
  imported: 'Imported',
  system: 'System',
};

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    category: food.category ?? '',
    source: SOURCE_LABELS[food.source ?? 'custom'],
    notes: food.notes ?? '',
    image_url: food.image_url ?? '',
    media_id: food.media?.id ?? null,
    calories_per_100g: food.calories_per_100g ?? undefined,
    protein_g: food.protein_g_per_100g ?? undefined,
    carbs_g: food.carbs_g_per_100g ?? undefined,
    fats_g: food.fat_g_per_100g ?? undefined,
    fiber_g: food.fiber_g_per_100g ?? undefined,
    sugar_g: food.sugar_g_per_100g ?? undefined,
  };
}

export function foodToMediaValue(food: Food): LibraryMediaValue | null {
  return food.media ? {contentType: food.media.content_type, kind: food.media.kind, url: food.media.url} : null;
}

export function foodToDuplicateFormValues(food: Food): FoodFormValues {
  // A copy is always coach-owned, whatever the original's provenance was.
  return {
    ...foodToFormValues(food),
    name: `${food.name} (copy)`,
    source: SOURCE_LABELS.custom,
  };
}

export function useFoodForm(options?: {defaultValues?: FoodFormValues}) {
  return useForm<FoodFormValues>({
    defaultValues: options?.defaultValues ?? FOOD_FORM_DEFAULTS,
    resolver: zodResolver(foodFormSchema),
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
      <FormPanel>
        <Fieldset>
          <Fieldset.Legend className="hidden sm:block">Details</Fieldset.Legend>
          <Description className="hidden sm:block">Name the food and where it came from.</Description>
          <Fieldset.Group>
            <LibraryMediaField
              {...(initialMedia !== undefined ? {initialMedia} : {})}
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
                isReadOnly
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

        <Separator className="my-6" />

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

        <Separator className="my-6" />

        <Fieldset>
          <Fieldset.Legend>Serving sizes</Fieldset.Legend>
          <Description>Optional presets clients can log against.</Description>

          <ServingSizesEditor
            onChange={onServingSizesChange}
            value={servingSizes}
          />
        </Fieldset>
      </FormPanel>

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
