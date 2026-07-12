import type {
  ClientProfileFormTemplate,
  Food,
  NutritionPlan,
  Recipe,
  TrainingExercise,
  TrainingPlan,
} from '@/api/generated';

/** Normalized card data shared by the Builder hub, section grids and previews. */
export interface BuilderItem {
  id: string;
  meta: string;
  name: string;
  updatedAt: string | null;
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export const trainingPlanItem = (p: TrainingPlan): BuilderItem => ({
  id: p.id,
  meta: [plural(p.workouts.length, 'workout day'), p.status === 'archived' ? 'Archived' : null]
    .filter(Boolean)
    .join(' · '),
  name: p.name,
  updatedAt: p.updated_at,
});

export const nutritionPlanItem = (p: NutritionPlan): BuilderItem => {
  // List responses carry macro targets but no meals.
  const parts = [
    p.target_calories != null ? `${p.target_calories} kcal` : null,
    p.target_protein_g != null ? `${p.target_protein_g}g protein` : null,
    p.status === 'archived' ? 'Archived' : null,
  ].filter(Boolean);
  return {
    id: p.id,
    meta: parts.join(' · ') || p.description || 'No targets set',
    name: p.name,
    updatedAt: p.updated_at,
  };
};

export const formTemplateItem = (f: ClientProfileFormTemplate): BuilderItem => {
  const questions = f.sections.reduce((sum, s) => sum + s.questions.length, 0);
  return {
    id: f.id,
    meta: `${plural(questions, 'question')} · ${f.purpose === 'intake' ? 'Intake' : 'Check-in'}`,
    name: f.name,
    updatedAt: f.updated_at,
  };
};

export const exerciseItem = (e: TrainingExercise): BuilderItem => ({
  id: e.id,
  meta: e.muscles.map((m) => m.name).join(', ') || 'No muscles assigned',
  name: e.name,
  updatedAt: e.updated_at,
});

export const recipeItem = (r: Recipe): BuilderItem => {
  const parts = [
    r.nutrition?.calories != null ? `${r.nutrition.calories} kcal` : null,
    plural(r.recipe_ingredients.length, 'ingredient'),
  ].filter(Boolean);
  return {
    id: r.id,
    meta: parts.join(' · '),
    name: r.name,
    updatedAt: r.updated_at,
  };
};

export const foodItem = (f: Food): BuilderItem => {
  const parts = [
    f.calories_per_100g != null ? `${f.calories_per_100g} kcal / 100 g` : null,
    f.brand || f.category,
  ].filter(Boolean);
  return {
    id: f.id,
    meta: parts.join(' · ') || 'Food',
    name: f.name,
    updatedAt: f.updated_at,
  };
};
