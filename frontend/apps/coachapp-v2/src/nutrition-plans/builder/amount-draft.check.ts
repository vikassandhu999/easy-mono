import {buildMealItemDraft} from './amount-draft.ts';

const recipe = buildMealItemDraft({
  activeServing: null,
  recipeId: 'recipe-id',
  resolvedWeightG: 230,
  servingCount: '0.5',
});

if (recipe.amount !== 0.5 || recipe.unit !== 'serving' || recipe.weight_g !== 230) {
  throw new Error('weighed recipes must retain their serving amount and unit');
}

console.log('nutrition-plan-amount-draft: all checks passed');
