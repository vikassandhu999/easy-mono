import {Button, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

export const nutritionPlanFormSchema = z.object({
  calories: z.coerce.number().min(0).optional().or(z.literal('')),
  carbs_g: z.coerce.number().min(0).optional().or(z.literal('')),
  description: z.string().optional(),
  fats_g: z.coerce.number().min(0).optional().or(z.literal('')),
  name: z.string().min(1, 'Name is required'),
  protein_g: z.coerce.number().min(0).optional().or(z.literal('')),
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanFormSchema>;

export const NUTRITION_PLAN_FORM_DEFAULTS: NutritionPlanFormValues = {
  calories: '',
  carbs_g: '',
  description: '',
  fats_g: '',
  name: '',
  protein_g: '',
};

/** Hook wrapper so screens don't need to import zod/resolver separately */
export function useNutritionPlanForm(options?: {values?: NutritionPlanFormValues}) {
  return useForm<NutritionPlanFormValues>({
    defaultValues: options?.values ? undefined : NUTRITION_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(nutritionPlanFormSchema),
    values: options?.values,
  });
}

type NutritionPlanFormProps = {
  form: ReturnType<typeof useNutritionPlanForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: NutritionPlanFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function NutritionPlanForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: NutritionPlanFormProps) {
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
          placeholder="e.g. Weight Loss Plan - Week 1"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <TextArea
          id="description"
          placeholder="Brief description of this plan..."
          rows={2}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
      </div>

      {/* Macros goal */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Macros Goal (daily target)</legend>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              inputMode="decimal"
              placeholder="0"
              type="number"
              {...register('calories')}
            />
            {errors.calories && <p className="text-xs text-danger">{errors.calories.message}</p>}
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
        </div>
      </fieldset>

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
