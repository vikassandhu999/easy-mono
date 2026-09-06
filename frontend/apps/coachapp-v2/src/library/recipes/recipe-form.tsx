import {Button, Description, ErrorMessage, Fieldset, Separator} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ArrowDown, ArrowUp, X} from 'lucide-react';
import {useFieldArray, useForm, useWatch} from 'react-hook-form';
import FoodPickerControl from '@/library/recipes/food-picker-control';
import {RECIPE_FORM_DEFAULTS, type RecipeFormValues, recipeFormSchema} from '@/library/recipes/recipe-form-data';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormNumberField} from '@/ui/form-number-field';
import {FormPanel} from '@/ui/form-panel';
import {FormTextAreaField} from '@/ui/form-text-area-field';
import {FormTextField} from '@/ui/form-text-field';

export function useRecipeForm(options?: {defaultValues?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.defaultValues ?? RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
  });
}

type RecipeFormProps = {
  form: ReturnType<typeof useRecipeForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: RecipeFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function RecipeForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: RecipeFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    setValue,
  } = form;
  const {fields, append, remove, move} = useFieldArray({control, name: 'recipe_ingredients'});
  const ingredients = useWatch({control, name: 'recipe_ingredients'});

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div inert={isSubmitting}>
        <FormPanel>
          <Fieldset>
            <Fieldset.Legend>Details</Fieldset.Legend>
            <Description>Name the dish and describe how it's made.</Description>
            <Fieldset.Group>
              <FormTextField
                control={control}
                fullWidth
                inputProps={{placeholder: 'e.g. Chicken & Rice Bowl'}}
                isRequired
                label="Name"
                name="name"
              />

              <FormTextAreaField
                control={control}
                fullWidth
                label="Instructions"
                name="instructions"
                textAreaProps={{placeholder: 'Steps to prepare the recipe…', rows: 4}}
              />

              <FormNumberField
                control={control}
                description="How many portions this recipe makes"
                fullWidth
                label="Servings"
                minValue={1}
                name="servings_count"
              />

              <FormNumberField
                control={control}
                description="Optional — weigh the finished dish to log it in grams"
                fullWidth
                label="Cooked weight (g)"
                minValue={0.1}
                name="cooked_weight_g"
              />
            </Fieldset.Group>
          </Fieldset>

          <Separator className="my-6" />

          <Fieldset>
            <Fieldset.Legend>Ingredients</Fieldset.Legend>
            <Description>Add foods and set the amount used.</Description>
            <Fieldset.Group>
              {fields.map((item, index) => (
                <div
                  className="space-y-3 rounded-panel border border-border p-3"
                  key={item.id}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 type-body font-semibold">
                      {item.food?.name ?? 'Unavailable food'}
                    </span>
                    <Button
                      aria-label={`Move ${item.food?.name ?? 'ingredient'} up`}
                      isDisabled={index === 0 || isSubmitting}
                      isIconOnly
                      onPress={() => move(index, index - 1)}
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      aria-label={`Move ${item.food?.name ?? 'ingredient'} down`}
                      isDisabled={index === fields.length - 1 || isSubmitting}
                      isIconOnly
                      onPress={() => move(index, index + 1)}
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      aria-label={`Remove ${item.food?.name ?? 'ingredient'}`}
                      isDisabled={isSubmitting}
                      isIconOnly
                      onPress={() => remove(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.food?.portion_options.map((portion, portionIndex) => (
                      <Button
                        key={portionIndex}
                        isDisabled={isSubmitting}
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          setValue(
                            `recipe_ingredients.${index}.portion`,
                            portion.kind === 'gram'
                              ? {kind: 'gram', grams: portion.grams ?? 100}
                              : {
                                  kind: 'serving',
                                  amount: portion.amount ?? 1,
                                  unit: portion.unit ?? '',
                                  label: portion.label,
                                },
                            {shouldDirty: true, shouldValidate: true},
                          )
                        }
                      >
                        {portion.kind === 'gram' ? 'Grams' : portion.label || portion.unit}
                      </Button>
                    ))}
                  </div>
                  <FormNumberField
                    control={control}
                    fullWidth
                    isRequired
                    label={
                      ingredients[index]?.portion.kind === 'gram'
                        ? 'Weight (g)'
                        : `Amount (${ingredients[index]?.portion.kind === 'serving' ? ingredients[index].portion.unit : ''})`
                    }
                    name={
                      ingredients[index]?.portion.kind === 'gram'
                        ? `recipe_ingredients.${index}.portion.grams`
                        : `recipe_ingredients.${index}.portion.amount`
                    }
                  />
                </div>
              ))}
              {errors.recipe_ingredients && (
                <ErrorMessage>
                  {errors.recipe_ingredients.root?.message ?? errors.recipe_ingredients.message}
                </ErrorMessage>
              )}
              <FoodPickerControl
                excludeIds={fields.map((item) => item.food_id)}
                onSelect={(foods) =>
                  append(foods.map((food) => ({food_id: food.id, food, portion: {kind: 'gram' as const, grams: 100}})))
                }
                triggerClassName="w-full rounded-panel border border-dashed border-border text-muted"
                triggerVariant="ghost"
              />
            </Fieldset.Group>
          </Fieldset>

          <Description>Nutrition totals appear after saving the recipe.</Description>
        </FormPanel>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
