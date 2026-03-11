import {Button} from '@heroui/react';
import {useRef} from 'react';
import {type Control, type FieldErrors, useFieldArray, type UseFormRegister} from 'react-hook-form';

import type {Food} from '@/entities/foods/api/foods';
import type {RecipeIngredient} from '@/entities/recipes/api/recipes';
import type {RecipeFormValues} from '@/features/library/recipes/recipeFormTypes';

import {createEmptyIngredient, RECIPE_NUMERIC_STEP} from '@/features/library/recipes/recipeFormSchema';
import RecipeIngredientRow from '@/features/library/recipes/RecipeIngredientRow';

type RecipeIngredientsSectionProps = {
  className: string;
  control: Control<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
  foods: Food[];
  initialIngredients?: RecipeIngredient[];
  register: UseFormRegister<RecipeFormValues>;
};

export default function RecipeIngredientsSection({
  className,
  control,
  errors,
  foods,
  initialIngredients,
  register,
}: RecipeIngredientsSectionProps) {
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const {fields, append, remove} = useFieldArray({control, name: 'ingredients'});

  return (
    <section className={className}>
      <p className="text-sm font-semibold text-foreground">Ingredients</p>

      <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
        <div>
          <p className="text-sm font-medium text-foreground">Ingredients</p>
          <p className="text-xs text-muted">
            {fields.length} ingredient
            {fields.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          className="min-h-11 gap-1 px-3"
          onPress={() => append(createEmptyIngredient())}
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="text-lg leading-none">+</span>
          <span>Add ingredient</span>
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-foreground">No ingredients yet</p>
            <p className="text-xs text-muted">Add your first ingredient to build this recipe.</p>
            <Button
              className="min-h-11 gap-1 px-3"
              onPress={() => append(createEmptyIngredient())}
              size="sm"
              type="button"
              variant="outline"
            >
              <span className="text-lg leading-none">+</span>
              <span>Add ingredient</span>
            </Button>
          </div>
        </div>
      ) : null}

      {fields.map((field, index) => (
        <RecipeIngredientRow
          foods={foods}
          form={{control, errors, register}}
          initialFood={initialIngredients?.[index]?.food}
          key={field.id}
          numericStep={RECIPE_NUMERIC_STEP}
          row={{
            id: field.id,
            index,
            onRemove: () => remove(index),
            ref: (node) => {
              rowRefs.current[index] = node;
            },
            title: `Ingredient ${index + 1}`,
          }}
        />
      ))}
    </section>
  );
}
