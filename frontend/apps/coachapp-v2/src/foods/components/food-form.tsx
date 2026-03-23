import {Button, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

export const foodFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  calories_per_100g: z.coerce.number().min(0).optional().or(z.literal('')),
  protein_g: z.coerce.number().min(0).optional().or(z.literal('')),
  carbs_g: z.coerce.number().min(0).optional().or(z.literal('')),
  fats_g: z.coerce.number().min(0).optional().or(z.literal('')),
  fiber_g: z.coerce.number().min(0).optional().or(z.literal('')),
  sugar_g: z.coerce.number().min(0).optional().or(z.literal('')),
});

export type FoodFormValues = z.infer<typeof foodFormSchema>;

export const FOOD_FORM_DEFAULTS: FoodFormValues = {
  name: '',
  category: '',
  source: '',
  notes: '',
  calories_per_100g: '',
  protein_g: '',
  carbs_g: '',
  fats_g: '',
  fiber_g: '',
  sugar_g: '',
};

/** Hook wrapper so screens don't need to import zod/resolver separately */
export function useFoodForm(options?: {values?: FoodFormValues}) {
  return useForm<FoodFormValues>({
    defaultValues: options?.values ? undefined : FOOD_FORM_DEFAULTS,
    resolver: zodResolver(foodFormSchema),
    values: options?.values,
  });
}

type FoodFormProps = {
  /** The react-hook-form instance returned by useFoodForm */
  form: ReturnType<typeof useFoodForm>;
  /** Called with validated form data */
  onSubmit: (data: FoodFormValues) => void;
  /** Whether the mutation is in progress */
  isSubmitting: boolean;
  /** Label for the submit button (e.g. "Create Food" or "Save Changes") */
  submitLabel: string;
  /** Label shown while submitting (e.g. "Creating..." or "Saving...") */
  submittingLabel: string;
  /** Called when Cancel is pressed */
  onCancel: () => void;
};

export default function FoodForm({
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onCancel,
}: FoodFormProps) {
  const {
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Chicken Breast"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      {/* Category + Source side by side on md */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g. Protein, Dairy, Grains"
            {...register('category')}
          />
          {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            placeholder="e.g. USDA, custom"
            {...register('source')}
          />
          {errors.source && <p className="text-xs text-danger">{errors.source.message}</p>}
        </div>
      </div>

      {/* Macros per 100g */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Nutrition per 100g</legend>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calories_per_100g">Calories</Label>
            <Input
              id="calories_per_100g"
              inputMode="decimal"
              placeholder="0"
              type="number"
              {...register('calories_per_100g')}
            />
            {errors.calories_per_100g && <p className="text-xs text-danger">{errors.calories_per_100g.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="protein_g">Protein (g)</Label>
            <Input
              id="protein_g"
              inputMode="decimal"
              placeholder="0"
              step="0.1"
              type="number"
              {...register('protein_g')}
            />
            {errors.protein_g && <p className="text-xs text-danger">{errors.protein_g.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="carbs_g">Carbs (g)</Label>
            <Input
              id="carbs_g"
              inputMode="decimal"
              placeholder="0"
              step="0.1"
              type="number"
              {...register('carbs_g')}
            />
            {errors.carbs_g && <p className="text-xs text-danger">{errors.carbs_g.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fats_g">Fats (g)</Label>
            <Input
              id="fats_g"
              inputMode="decimal"
              placeholder="0"
              step="0.1"
              type="number"
              {...register('fats_g')}
            />
            {errors.fats_g && <p className="text-xs text-danger">{errors.fats_g.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fiber_g">Fiber (g)</Label>
            <Input
              id="fiber_g"
              inputMode="decimal"
              placeholder="0"
              step="0.1"
              type="number"
              {...register('fiber_g')}
            />
            {errors.fiber_g && <p className="text-xs text-danger">{errors.fiber_g.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sugar_g">Sugar (g)</Label>
            <Input
              id="sugar_g"
              inputMode="decimal"
              placeholder="0"
              step="0.1"
              type="number"
              {...register('sugar_g')}
            />
            {errors.sugar_g && <p className="text-xs text-danger">{errors.sugar_g.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          id="notes"
          placeholder="Additional notes about this food..."
          rows={2}
          {...register('notes')}
        />
        {errors.notes && <p className="text-xs text-danger">{errors.notes.message}</p>}
      </div>

      {/* Root error */}
      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      {/* Actions */}
      <div className="flex flex-row gap-2 pt-2">
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
      </div>
    </form>
  );
}
