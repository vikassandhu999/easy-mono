import {Button, Description, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useMemo} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import type {Food} from '@/api/foods';

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

/** Hook wrapper so screens don't need to import zod/resolver separately */
export function useRecipeForm(options?: {values?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.values ? undefined : RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
    values: options?.values,
  });
}

type RecipeFormProps = {
  /** The react-hook-form instance returned by useRecipeForm */
  form: ReturnType<typeof useRecipeForm>;
  /** Called with validated form data */
  onSubmit: (data: RecipeFormValues) => void;
  /** Whether the mutation is in progress */
  isSubmitting: boolean;
  /** Label for the submit button */
  submitLabel: string;
  /** Label shown while submitting */
  submittingLabel: string;
  /** Called when Cancel is pressed */
  onCancel: () => void;
  /** Current ingredients list (managed by parent) */
  ingredients: IngredientItem[];
  /** Called when ingredients change */
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
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);

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
    },
    [ingredients, onIngredientsChange],
  );

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
          placeholder="e.g. Overnight Oats"
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

      {/* Ingredients */}
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
          onChange={onIngredientsChange}
          value={ingredients}
        />
      </fieldset>

      {/* Cooked weight */}
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

      {/* Instructions */}
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
