import { z } from "zod";

import type { Recipe } from "@/api/recipes";
import type {
  RecipeFormIngredient,
  RecipeFormValues,
} from "@/pages/library/recipeFormTypes";

import {
  parseOptionalNumber,
  toStringValue,
} from "@/pages/library/libraryShared";
import {
  CALORIES_MAX,
  createEmptyServingSize,
  MACRO_GRAMS_MAX,
  validateImageUrl,
  validateMacroField,
  validateServingSizes,
} from "@/pages/library/libraryFormSchemaShared";

export const createEmptyIngredient = (): RecipeFormIngredient => ({
  amount: "",
  food_id: "",
  unit: "",
  weight_g: "",
});

export const RECIPE_NUMERIC_STEP = "0.1";

export const RECIPE_FORM_SCHEMA = z
  .object({
    calories: z.string(),
    carbs: z.string(),
    category: z.string(),
    cooked_weight_g: z.string(),
    fat: z.string(),
    image_url: z.string(),
    ingredients: z.array(
      z.object({
        amount: z.string(),
        food_id: z.string(),
        unit: z.string(),
        weight_g: z.string(),
      }),
    ),
    instructions: z.string(),
    name: z.string().trim().min(1, "Recipe name is required."),
    protein: z.string(),
    service_size_type: z.enum(["serving_based", "weight_based"]),
    serving_sizes: z.array(
      z.object({
        amount: z.string(),
        unit: z.string(),
        weight_g: z.string(),
      }),
    ),
    source: z.string(),
    tags: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    validateMacroField(ctx, values, "calories", "Calories", CALORIES_MAX);
    validateMacroField(ctx, values, "protein", "Protein", MACRO_GRAMS_MAX);
    validateMacroField(ctx, values, "carbs", "Carbs", MACRO_GRAMS_MAX);
    validateMacroField(ctx, values, "fat", "Fat", MACRO_GRAMS_MAX);

    validateImageUrl(ctx, values.image_url);

    if (values.cooked_weight_g.trim()) {
      const cookedWeight = Number(values.cooked_weight_g);
      if (!Number.isFinite(cookedWeight) || cookedWeight < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cooked weight must be 0 or more.",
          path: ["cooked_weight_g"],
        });
      }
    }

    values.ingredients.forEach((ingredient, index) => {
      const hasFood = Boolean(ingredient.food_id);
      const hasAmount = Boolean(ingredient.amount.trim());
      const hasUnit = Boolean(ingredient.unit.trim());
      const hasWeight = Boolean(ingredient.weight_g.trim());

      if ((hasAmount || hasUnit || hasWeight) && !hasFood) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Ingredient ${index + 1}: select a food when adding amount, unit, or weight.`,
          path: ["ingredients", index, "food_id"],
        });
      }

      if (hasAmount) {
        const amount = Number(ingredient.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ingredient ${index + 1}: amount must be 0 or more.`,
            path: ["ingredients", index, "amount"],
          });
        }
      }

      if (hasWeight) {
        const weight = Number(ingredient.weight_g);
        if (!Number.isFinite(weight) || weight < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ingredient ${index + 1}: weight must be 0 or more.`,
            path: ["ingredients", index, "weight_g"],
          });
        }
      }
    });

    validateServingSizes(ctx, values.serving_sizes);
  });

export const RECIPE_INITIAL_VALUES: RecipeFormValues = {
  calories: "",
  carbs: "",
  category: "",
  cooked_weight_g: "",
  fat: "",
  image_url: "",
  ingredients: [createEmptyIngredient()],
  instructions: "",
  name: "",
  protein: "",
  service_size_type: "serving_based",
  serving_sizes: [createEmptyServingSize()],
  source: "",
  tags: [],
};

export const mapRecipeToFormValues = (recipe: Recipe): RecipeFormValues => ({
  calories: toStringValue(recipe.macros?.calories ?? recipe.macros?.kcal),
  carbs: toStringValue(recipe.macros?.carbs ?? recipe.macros?.carbs_g),
  category: recipe.category ?? "",
  cooked_weight_g: toStringValue(recipe.cooked_weight_g),
  fat: toStringValue(recipe.macros?.fat ?? recipe.macros?.fat_g),
  image_url: recipe.image_url ?? "",
  ingredients:
    recipe.recipe_ingredients.length > 0
      ? recipe.recipe_ingredients.map((ingredient) => ({
          amount: toStringValue(ingredient.amount),
          food_id: ingredient.food_id,
          unit: ingredient.unit ?? "",
          weight_g: toStringValue(ingredient.weight_g),
        }))
      : [createEmptyIngredient()],
  instructions: recipe.instructions ?? "",
  name: recipe.name,
  protein: toStringValue(recipe.macros?.protein ?? recipe.macros?.protein_g),
  service_size_type:
    recipe.service_size_type === "weight_based"
      ? "weight_based"
      : "serving_based",
  serving_sizes:
    recipe.serving_sizes.length > 0
      ? recipe.serving_sizes.map((servingSize) => ({
          amount: toStringValue(servingSize.amount),
          unit: servingSize.unit,
          weight_g: toStringValue(servingSize.weight_g),
        }))
      : [createEmptyServingSize()],
  source: recipe.source ?? "",
  tags: recipe.tags,
});

export const parseOptionalRecipeNumber = (
  value: string,
): number | undefined => {
  return parseOptionalNumber(value);
};
