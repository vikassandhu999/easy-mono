import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  NumberField,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {FormNumberField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {Food, FoodServingSize, RecipeIngredient, RecipeIngredientRequest, RecipeRequest} from '@/api/generated';
import {omitUndefined, type ServingSize, toOptionalNumber, toOptionalText} from '@/api/shared';
import {
  canComputeRecipeNutrition,
  computeRecipeNutritionFromIngredients,
  createIngredientDraft,
} from '@/domain/recipes';
import FoodPickerControl from '@/foods/components/food-picker-control';
import IngredientList, {type IngredientItem} from '@/foods/components/ingredient-list';

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

export const recipeFormSchema = z.object({
  name: z.string().min(1, 'Enter recipe name'),
  instructions: z.string().optional(),
  cooked_weight_g: optionalNumber,
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  instructions: '',
  cooked_weight_g: undefined,
};

// Live nutrition preview is computed per 100 g (or per cooked weight when set).
const PREVIEW_MACRO_LABELS = [
  {key: 'calories_per_100g', label: 'Calories', unit: ''},
  {key: 'protein_g', label: 'Protein', unit: 'g'},
  {key: 'carbs_g', label: 'Carbs', unit: 'g'},
  {key: 'fats_g', label: 'Fats', unit: 'g'},
  {key: 'fiber_g', label: 'Fiber', unit: 'g'},
] as const;

export function recipeIngredientsToDrafts(ingredients: RecipeIngredient[]): IngredientItem[] {
  // Filter out any ingredients where the backend didn't hydrate the food object
  // (food is Food | null in generated; IngredientItem requires Food).
  return ingredients
    .filter(
      (ingredient): ingredient is RecipeIngredient & {food: NonNullable<RecipeIngredient['food']>} =>
        ingredient.food != null,
    )
    .map((ingredient) => ({
      food: ingredient.food,
      food_id: ingredient.food_id,
      amount: ingredient.amount ?? '',
      unit: ingredient.unit ?? '',
      weight_g: ingredient.weight_g ?? '',
    }));
}

// Array order IS the ingredient order: each mapped ingredient carries position: index.
function recipeIngredientDraftToApi(item: IngredientItem, index: number): RecipeIngredientRequest {
  return omitUndefined({
    food_id: item.food_id,
    position: index,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  }) as RecipeIngredientRequest;
}

function toRecipeServingSizes(sizes: ServingSize[]): FoodServingSize[] {
  return sizes.map((s) => ({
    unit: s.unit,
    amount: s.amount ?? 1,
    weight_g: s.weight_g ?? 0,
    is_default: false,
    label: s.unit,
  }));
}

export function recipeToFormValues(recipe: {
  name: string;
  instructions: string | null;
  cooked_weight_g: number | null;
}): RecipeFormValues {
  return {
    name: recipe.name,
    instructions: recipe.instructions ?? '',
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
  };
}

type RecipeRequestArgs = {
  ingredients: IngredientItem[];
  servingSizes: ServingSize[];
  values: RecipeFormValues;
};

// Create and update build the request identically: a full replace of the
// ingredients array (position: index on each) and the serving sizes.
function buildRecipeRequest({ingredients, servingSizes, values}: RecipeRequestArgs): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
    serving_sizes: servingSizes.length > 0 ? toRecipeServingSizes(servingSizes) : undefined,
  }) as RecipeRequest;
}

export function recipeToCreateRequest(args: RecipeRequestArgs): RecipeRequest {
  return buildRecipeRequest(args);
}

export function recipeToUpdateRequest(args: RecipeRequestArgs): RecipeRequest {
  return buildRecipeRequest(args);
}

export function useRecipeForm(options?: {values?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.values ? undefined : RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
    values: options?.values,
  });
}

type RecipeFormProps = {
  form: ReturnType<typeof useRecipeForm>;
  ingredients: IngredientItem[];
  isSubmitting: boolean;
  onCancel: () => void;
  onIngredientsChange: (items: IngredientItem[]) => void;
  onServingSizesChange: (sizes: ServingSize[]) => void;
  onSubmit: (data: RecipeFormValues) => void;
  servingSizes: ServingSize[];
  submitLabel: string;
  submittingLabel: string;
};

export default function RecipeForm({
  form,
  ingredients,
  isSubmitting,
  onCancel,
  onIngredientsChange,
  onServingSizesChange,
  onSubmit,
  servingSizes,
  submitLabel,
  submittingLabel,
}: RecipeFormProps) {
  const {
    clearErrors,
    control,
    formState: {errors},
    handleSubmit,
    setError,
    watch,
  } = form;

  const [autoExpandId, setAutoExpandId] = useState<null | string>(null);
  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);

  const cookedWeight = watch('cooked_weight_g');
  const nutrition = useMemo(
    () =>
      canComputeRecipeNutrition(ingredients)
        ? computeRecipeNutritionFromIngredients({cookedWeight, ingredients})
        : null,
    [cookedWeight, ingredients],
  );

  const handleFoodSelect = useCallback(
    (food: Food) => {
      onIngredientsChange([...ingredients, createIngredientDraft(food)]);
      setAutoExpandId(food.id);
    },
    [ingredients, onIngredientsChange],
  );

  // Ingredients are a separate prop (not a zod field), so the "at least one"
  // rule is enforced here in the submit path via a root form error.
  const handleValidSubmit = useCallback(
    (data: RecipeFormValues) => {
      if (ingredients.length === 0) {
        setError('root', {message: 'Add at least one ingredient'});
        return;
      }
      // The backend rejects a recipe whose ingredients can't be costed into macros;
      // catch it here with an actionable message instead of a generic 422.
      if (!canComputeRecipeNutrition(ingredients)) {
        setError('root', {message: 'An ingredient is missing nutrition data — edit that food to add its macros.'});
        return;
      }
      clearErrors('root');
      onSubmit(data);
    },
    [clearErrors, ingredients, onSubmit, setError],
  );

  return (
    <Form onSubmit={handleSubmit(handleValidSubmit)}>
      <Fieldset>
        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            isRequired
            label="Name"
            name="name"
          />

          <FormTextAreaField
            control={control}
            fullWidth
            label="Instructions (optional)"
            name="instructions"
            textAreaProps={{rows: 4}}
          />

          <FormNumberField
            control={control}
            fullWidth
            label="Cooked weight, grams"
            minValue={0}
            name="cooked_weight_g"
            step={1}
          />

          <div className="space-y-2">
            <Label className="block text-sm font-medium">Ingredients</Label>
            <IngredientList
              autoExpandId={autoExpandId}
              onAutoExpandConsumed={() => setAutoExpandId(null)}
              onChange={onIngredientsChange}
              value={ingredients}
            />
            <FoodPickerControl
              excludeIds={excludeIds}
              onSelect={handleFoodSelect}
            />
          </div>

          {nutrition && (
            <div className="space-y-2">
              <Label className="block text-sm font-medium">Nutrition (per 100 g)</Label>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-3 text-sm sm:grid-cols-3">
                {PREVIEW_MACRO_LABELS.filter(({key}) => nutrition[key] != null).map(({key, label, unit}) => (
                  <div key={key}>
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {label}
                    </Typography>
                    <Typography weight="medium">
                      {nutrition[key]}
                      {unit}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RecipeServingSizesEditor
            onChange={onServingSizesChange}
            servingSizes={servingSizes}
          />
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions className={'mt-4 flex gap-4'}>
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
      </Fieldset.Actions>
    </Form>
  );
}

// Mirrors the serving-size section of foods/food-form: amount / unit / weight
// rows with add + remove, kept collapsed behind an "Add serving size" button.
function RecipeServingSizesEditor({
  onChange,
  servingSizes,
}: {
  onChange: (sizes: ServingSize[]) => void;
  servingSizes: ServingSize[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newAmount, setNewAmount] = useState<number | undefined>();
  const [newWeightG, setNewWeightG] = useState<number | undefined>();
  const [servingError, setServingError] = useState('');

  const resetForm = useCallback(() => {
    setNewUnit('');
    setNewAmount(undefined);
    setNewWeightG(undefined);
    setServingError('');
  }, []);

  const handleAdd = useCallback(() => {
    const unit = newUnit.trim();
    if (!unit) {
      setServingError('Enter serving unit');
      return;
    }
    const serving: ServingSize = {unit, amount: newAmount ?? null, weight_g: newWeightG ?? null};
    onChange([...servingSizes, serving]);
    resetForm();
    setIsAdding(false);
  }, [newAmount, newUnit, newWeightG, onChange, resetForm, servingSizes]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(servingSizes.filter((_, i) => i !== index));
    },
    [onChange, servingSizes],
  );

  return (
    <div className="space-y-2">
      <Label className="block text-sm font-medium">Serving sizes</Label>

      {servingSizes.length > 0 && (
        <div className="flex flex-col gap-2">
          {servingSizes.map((serving, i) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              key={i}
            >
              <Typography weight="medium">
                {serving.amount ?? 1} {serving.unit}
              </Typography>
              <div className="flex items-center gap-2">
                {serving.weight_g != null && serving.weight_g > 0 && (
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    {serving.weight_g}g
                  </Typography>
                )}
                <Button
                  aria-label={`Remove ${serving.unit}`}
                  className="min-h-11 min-w-11"
                  isIconOnly
                  onPress={() => handleRemove(i)}
                  size="sm"
                  variant="ghost"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <Fieldset>
          <Fieldset.Group>
            <TextField
              fullWidth
              isInvalid={!!servingError}
              isRequired
            >
              <Label>Unit</Label>
              <Description>Use a common portion, like cup or serving</Description>
              {servingError && <FieldError>{servingError}</FieldError>}
              <Input
                onChange={(e) => {
                  setNewUnit(e.target.value);
                  setServingError('');
                }}
                value={newUnit}
              />
            </TextField>
            <NumberField
              fullWidth
              minValue={0}
              onChange={(value) => setNewAmount(Number.isNaN(value) ? undefined : value)}
              value={newAmount}
            >
              <Label>Amount (optional)</Label>
              <Description>Use 1 if it is a single portion</Description>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
            <NumberField
              fullWidth
              minValue={0}
              onChange={(value) => setNewWeightG(Number.isNaN(value) ? undefined : value)}
              value={newWeightG}
            >
              <Label>Weight, grams (optional)</Label>
              <Description>Add this when the portion has a known weight</Description>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
            </NumberField>
          </Fieldset.Group>
          <Fieldset.Actions>
            <Button
              onPress={handleAdd}
              size="sm"
            >
              <Plus size={14} />
              Add
            </Button>
            <Button
              onPress={() => {
                setIsAdding(false);
                resetForm();
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </Fieldset.Actions>
        </Fieldset>
      ) : (
        <Button
          onPress={() => setIsAdding(true)}
          size="sm"
          variant="ghost"
        >
          <Plus size={14} />
          Add serving size
        </Button>
      )}
    </div>
  );
}
