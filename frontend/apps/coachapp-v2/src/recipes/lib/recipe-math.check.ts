import {
  canComputeRecipeNutrition,
  computeRecipeTotalsFromIngredients,
  recipeServings,
  scaleFoodMacros,
} from './recipe-math.ts';

const food = {
  calories_per_100g: 10.16,
  carbs_g_per_100g: 2,
  fat_g_per_100g: 3,
  fiber_g_per_100g: 4,
  protein_g_per_100g: 1,
};

const scaled = scaleFoodMacros(food, 100);
if (scaled.calories !== 10.16 || scaled.complete !== true) {
  throw new Error('complete food macros must keep full precision');
}

const incomplete = scaleFoodMacros({...food, protein_g_per_100g: null}, 50);
if (incomplete.protein !== null || incomplete.complete !== false || incomplete.calories !== 5.08) {
  throw new Error('unknown nutrients must stay unknown');
}

const totals = computeRecipeTotalsFromIngredients([
  {food, weight_g: 100},
  {food: {...food, protein_g_per_100g: null}, weight_g: 50},
]);
if (totals == null || totals.calories !== 15.2 || totals.protein !== null || totals.complete !== false) {
  throw new Error('recipe totals must propagate unknown nutrients and round at the edge');
}

if (recipeServings({servings_count: 4}) !== 4) {
  throw new Error('recipe servings must use the stored count');
}

if (
  canComputeRecipeNutrition([
    {food, weight_g: 100},
    {food, weight_g: ''},
  ])
) {
  throw new Error('recipe nutrition requires a weight on every ingredient');
}

if (!canComputeRecipeNutrition([{food, weight_g: 100}])) {
  throw new Error('a fully weighed recipe must be computable');
}

console.log('recipe-math: all checks passed');
