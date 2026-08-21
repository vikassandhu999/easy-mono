import {pickedToItemRef, toItemInput} from './nutrition-item-ref.ts';

const food = toItemInput({food_id: 'food-id', kind: 'food'});
if (food.kind !== 'food' || food.food_id !== 'food-id' || 'recipe_id' in food) {
  throw new Error('food item refs must emit only food_id');
}

const recipe = toItemInput({kind: 'recipe', recipe_id: 'recipe-id'});
if (recipe.kind !== 'recipe' || recipe.recipe_id !== 'recipe-id' || 'food_id' in recipe) {
  throw new Error('recipe item refs must emit only recipe_id');
}

const picked = pickedToItemRef({id: 'x', kind: 'recipe'});
if (picked.kind !== 'recipe' || picked.recipe_id !== 'x') {
  throw new Error('picked items must map to item refs');
}
