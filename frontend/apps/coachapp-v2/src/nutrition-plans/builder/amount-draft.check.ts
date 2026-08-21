import {buildMealItemDraft} from './amount-draft.ts';

const recipe = buildMealItemDraft({
  activeServing: null,
  recipeId: 'recipe-id',
  resolvedWeightG: 230,
  servingCount: '0.5',
});

if (recipe.kind !== 'recipe' || recipe.portion.kind !== 'gram' || recipe.portion.grams !== 230) {
  throw new Error('weighed recipes must send a gram Portion');
}

const recipeServing = buildMealItemDraft({
  activeServing: null,
  recipeId: 'recipe-id',
  resolvedWeightG: null,
  servingCount: '0.5',
});

if (
  recipeServing.portion.kind !== 'serving' ||
  recipeServing.portion.amount !== 0.5 ||
  recipeServing.portion.unit !== 'serving'
) {
  throw new Error('Recipes without cooked weight must send a serving Portion');
}

const foodServing = buildMealItemDraft({
  activeServing: {label: '1 cup', unit: 'cup'},
  foodId: 'food-id',
  resolvedWeightG: 80,
  servingCount: '1',
});

if (
  foodServing.kind !== 'food' ||
  foodServing.portion.kind !== 'serving' ||
  foodServing.portion.unit !== 'cup' ||
  foodServing.portion.label !== '1 cup' ||
  foodServing.portion.amount !== 1
) {
  throw new Error('Food servings must retain display unit and label');
}

const foodGrams = buildMealItemDraft({
  activeServing: null,
  foodId: 'food-id',
  resolvedWeightG: 50,
  servingCount: '1',
});

if (foodGrams.portion.kind !== 'gram' || foodGrams.portion.grams !== 50) {
  throw new Error('Food gram Portions must send resolved grams');
}

console.log('nutrition-plan-amount-draft: all checks passed');
