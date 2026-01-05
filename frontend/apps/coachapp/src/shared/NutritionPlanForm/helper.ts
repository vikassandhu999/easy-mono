import {NutritionPlan} from '@/services/nutrition_plans';

// Note: Field validations are defined in nutrition_plans_definition.ts (Zod schemas)
// - name: Required, Min(2), Max(255)
// - description: Optional, Max(255)
// - thumbnail_url: Optional, Must be valid URL

export const getDefaultValues = {
  name: '',
  description: '',
  thumbnail_url: '',
  is_template: true,
  status: 'draft' as const,
  start_date: '',
  end_date: '',
  tags: [] as string[],
};

export const populateNutritionPlan = (plan: NutritionPlan) => ({
  name: plan.name,
  description: plan.description || '',
  thumbnail_url: plan.thumbnail_url || '',
  is_template: plan.is_template,
  status: plan.status,
  start_date: plan.start_date || '',
  end_date: plan.end_date || '',
  tags: plan.tags || [],
});
