import {NutritionPlan} from '@/services/nutrition_plans';

export const getDefaultValues = {
    name: '',
    description: '',
    thumbnail_url: '',
    is_template: true,
    status: 'draft' as const,
    duration_weeks: 4,
    tags: [] as string[],
    meals: [] as any[],
};

export const populateNutritionPlan = (plan: NutritionPlan) => ({
    name: plan.name,
    description: plan.description || '',
    thumbnail_url: plan.thumbnail_url || '',
    is_template: plan.is_template,
    status: plan.status,
    duration_weeks: plan.duration_weeks,
    tags: plan.tags || [],
    meals: plan.meals || [],
});
