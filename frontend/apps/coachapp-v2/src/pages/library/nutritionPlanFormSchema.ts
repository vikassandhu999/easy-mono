import {z} from 'zod';

import type {NutritionPlan} from '@/api/nutritionPlans';
import type {NutritionPlanFormValues} from '@/pages/library/nutritionPlanFormTypes';

const MACRO_MAX = 10000;

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const toStringValue = (value: null | number | undefined) =>
  value === null || value === undefined ? '' : String(value);

export const NUTRITION_PLAN_FORM_SCHEMA = z
  .object({
    calories: z.string(),
    carbs: z.string(),
    description: z.string(),
    fat: z.string(),
    name: z.string().trim().min(1, 'Plan name is required.'),
    protein: z.string(),
    status: z.enum(['draft', 'active', 'archived']),
    tags: z.array(z.string()),
    type: z.enum(['template', 'personal']),
  })
  .superRefine((values, ctx) => {
    const validateMacroField = (field: 'calories' | 'carbs' | 'fat' | 'protein', label: string) => {
      const raw = values[field];
      if (!raw.trim()) {
        return;
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid number.`,
          path: [field],
        });
        return;
      }

      if (parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be 0 or more.`,
          path: [field],
        });
        return;
      }

      if (parsed > MACRO_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} seems too high (max ${MACRO_MAX}).`,
          path: [field],
        });
      }
    };

    validateMacroField('calories', 'Calories');
    validateMacroField('protein', 'Protein');
    validateMacroField('carbs', 'Carbs');
    validateMacroField('fat', 'Fat');
  });

export const NUTRITION_PLAN_INITIAL_VALUES: NutritionPlanFormValues = {
  calories: '',
  carbs: '',
  description: '',
  fat: '',
  name: '',
  protein: '',
  status: 'draft',
  tags: [],
  type: 'template',
};

export const mapNutritionPlanToFormValues = (nutritionPlan: NutritionPlan): NutritionPlanFormValues => ({
  calories: toStringValue(nutritionPlan.macros_goal?.calories ?? nutritionPlan.macros_goal?.kcal),
  carbs: toStringValue(nutritionPlan.macros_goal?.carbs ?? nutritionPlan.macros_goal?.carbs_g),
  description: nutritionPlan.description ?? '',
  fat: toStringValue(nutritionPlan.macros_goal?.fat ?? nutritionPlan.macros_goal?.fat_g),
  name: nutritionPlan.name,
  protein: toStringValue(nutritionPlan.macros_goal?.protein ?? nutritionPlan.macros_goal?.protein_g),
  status: nutritionPlan.status === 'active' || nutritionPlan.status === 'archived' ? nutritionPlan.status : 'draft',
  tags: nutritionPlan.tags,
  type: nutritionPlan.type === 'personal' ? 'personal' : 'template',
});

export const parseOptionalPlanNumber = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? roundToOneDecimal(parsed) : undefined;
};
