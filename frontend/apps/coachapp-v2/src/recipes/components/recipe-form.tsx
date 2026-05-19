import {Button, Description, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Calculator} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import type {Food} from '@/api/foods';

import {normalizeMacros} from '@/api/shared';
import FoodPicker from '@/foods/components/food-picker';
import IngredientList, {type IngredientItem} from '@/foods/components/ingredient-list';

export const recipeFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  source: z.string().optional(),
  instructions: z.string().optional(),
  cooked_weight_g: z.coerce.number().min(0).optional().or(z.literal('')),
  calories_per_100g: z.coerce.number().min(0).optional().or(z.literal('')),
  protein_g: z.coerce.number().min(0).optional().or(z.literal('')),
  carbs_g: z.coerce.number().min(0).optional().or(z.literal('')),
  fats_g: z.coerce.number().min(0).optional().or(z.literal('')),
  fiber_g: z.coerce.number().min(0).optional().or(z.literal('')),
  sugar_g: z.coerce.number().min(0).optional().or(z.literal('')),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  category: '',
  source: '',
  instructions: '',
  cooked_weight_g: '',
  calories_per_100g: '',
  protein_g: '',
  carbs_g: '',
  fats_g: '',
  fiber_g: '',
  sugar_g: '',
};

export function useRecipeForm(options?: {values?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.values ? undefined : RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
    values: options?.values,
  });
}

type RecipeFormProps = {
  form: ReturnType<typeof useRecipeForm>;
  onSubmit: (data: RecipeFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
  ingredients: IngredientItem[];
  onIngredientsChange: (items: IngredientItem[]) => void;
};

export default function RecipeForm({
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onCancel,
  ingredients,
  onIngredientsChange,
}: RecipeFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
    setValue,
  } = form;

  const [autoExpandId, setAutoExpandId] = useState<null | string>(null);
  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);

  // Watch cooked_weight_g for the auto-compute function
  const cookedWeightRaw = useWatch({control, name: 'cooked_weight_g'});

  // Check if at least one ingredient has weight_g set (precondition for compute)
  const canCompute = useMemo(
    () => ingredients.some((item) => item.weight_g !== '' && item.weight_g != null && Number(item.weight_g) > 0),
    [ingredients],
  );

  const computeNutrition = useCallback(() => {
    // Sum macros across all ingredients with valid weight_g
    const totals: Record<string, number> = {};
    let totalWeight = 0;

    for (const item of ingredients) {
      const wg = Number(item.weight_g);
      if (!wg || wg <= 0) continue;
      totalWeight += wg;

      // Normalize keys so system-imported foods (calories, protein, carbs, fat)
      // are mapped to canonical form keys (calories_per_100g, protein_g, etc.)
      const normalized = normalizeMacros(item.food.macros);
      for (const [key, val] of Object.entries(normalized)) {
        if (typeof val !== 'number') continue;
        // Scale: food macros are per 100g, so scale by (weight_g / 100)
        totals[key] = (totals[key] ?? 0) + val * (wg / 100);
      }
    }

    if (totalWeight === 0) return;

    // Convert to per-100g of cooked recipe
    const cookedWeight = Number(cookedWeightRaw);
    const divisor = cookedWeight > 0 ? cookedWeight : totalWeight;
    const per100g = (val: number) => Math.round(val * (100 / divisor) * 10) / 10;

    // All keys are now canonical after normalizeMacros
    setValue('calories_per_100g', per100g(totals.calories_per_100g ?? 0));
    setValue('protein_g', per100g(totals.protein_g ?? 0));
    setValue('carbs_g', per100g(totals.carbs_g ?? 0));
    setValue('fats_g', per100g(totals.fats_g ?? 0));

    // fiber_g and sugar_g — only set if present in ingredient macros
    if (totals.fiber_g != null) {
      setValue('fiber_g', per100g(totals.fiber_g));
    }
    if (totals.sugar_g != null) {
      setValue('sugar_g', per100g(totals.sugar_g));
    }
  }, [ingredients, cookedWeightRaw, setValue]);

  const handleFoodSelect = useCallback(
    (food: Food) => {
      const newItem: IngredientItem = {
        food,
        food_id: food.id,
        amount: '',
        unit: '',
        weight_g: '',
      };
      onIngredientsChange([...ingredients, newItem]);
      setAutoExpandId(food.id);
    },
    [ingredients, onIngredientsChange],
  );

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Overnight Oats"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g. Breakfast, Snack"
            {...register('category')}
          />
          {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            placeholder="e.g. Coach, Client"
            {...register('source')}
          />
          {errors.source && <p className="text-xs text-danger">{errors.source.message}</p>}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <div>
          <legend className="text-sm font-semibold">Ingredients</legend>
          <Description className="text-xs">Search and add food items to this recipe</Description>
        </div>
        <FoodPicker
          excludeIds={excludeIds}
          onSelect={handleFoodSelect}
        />
        <IngredientList
          autoExpandId={autoExpandId}
          onChange={onIngredientsChange}
          value={ingredients}
        />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions</Label>
        <TextArea
          id="instructions"
          placeholder="Step-by-step preparation instructions..."
          rows={4}
          {...register('instructions')}
        />
        {errors.instructions && <p className="text-xs text-danger">{errors.instructions.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cooked_weight_g">Cooked Weight (g)</Label>
        <Input
          id="cooked_weight_g"
          inputMode="decimal"
          placeholder="Total cooked weight in grams"
          type="number"
          {...register('cooked_weight_g')}
        />
        {errors.cooked_weight_g && <p className="text-xs text-danger">{errors.cooked_weight_g.message}</p>}
      </div>

      <fieldset className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-sm font-semibold">Nutrition per 100g</legend>
          <Button
            isDisabled={!canCompute}
            onPress={computeNutrition}
            size="sm"
            variant="ghost"
          >
            <Calculator size={14} />
            {canCompute ? 'Calculate from ingredients' : 'Set ingredient weights first'}
          </Button>
        </div>

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

      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

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
