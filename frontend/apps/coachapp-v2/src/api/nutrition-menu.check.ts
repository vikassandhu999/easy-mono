import {isLocalNodeId, moveId, planToMenuRequest} from './nutrition-menu.ts';

const plan = {
  revision: 4,
  meals: [
    {
      id: 'persisted-meal',
      name: 'Breakfast',
      notes: null,
      position: 30,
      meal_items: [
        {
          id: 'persisted-item',
          kind: 'food',
          food_id: 'yogurt-id',
          recipe_id: null,
          position: 9,
          portion: {kind: 'gram', grams: 50, amount: null, unit: null, label: null},
        },
      ],
    },
    {
      id: 'local:meal-dinner',
      name: 'Dinner',
      notes: 'Evening',
      position: 10,
      meal_items: [
        {
          id: 'local:item-rice',
          kind: 'recipe',
          food_id: null,
          recipe_id: 'rice-id',
          position: 40,
          portion: {kind: 'serving', grams: null, amount: 1, unit: 'serving', label: null},
        },
        {
          id: 'persisted-item-cup',
          kind: 'food',
          food_id: 'yogurt-id',
          recipe_id: null,
          position: 20,
          portion: {kind: 'serving', grams: 80, amount: 1, unit: 'cup', label: '1 cup'},
        },
      ],
    },
  ],
} as unknown as Parameters<typeof planToMenuRequest>[0];

const request = planToMenuRequest(plan);

if (request.expected_revision !== 4) {
  throw new Error('Menu replacement must send the observed plan revision');
}
if (request.meals[0]?.id !== 'persisted-meal' || request.meals[0]?.position !== 30) {
  throw new Error('persisted Meals must retain server identity and explicit sparse position');
}
if (request.meals[1]?.local_ref !== 'meal-dinner' || request.meals[1]?.position !== 10) {
  throw new Error('new Meals must use request-local identity and explicit sparse position');
}
if (request.meals[0]?.meal_items[0]?.id !== 'persisted-item' || request.meals[0]?.meal_items[0]?.position !== 9) {
  throw new Error('persisted Menu Items must retain server identity and explicit sparse position');
}
if (
  request.meals[1]?.meal_items[0]?.local_ref !== 'item-rice' ||
  request.meals[1]?.meal_items[0]?.position !== 40 ||
  request.meals[1]?.meal_items[0]?.portion.kind !== 'serving'
) {
  throw new Error('new Menu Items must use request-local identity, explicit position, and Portion');
}
if (
  request.meals[1]?.meal_items[1]?.id !== 'persisted-item-cup' ||
  request.meals[1]?.meal_items[1]?.portion.label !== '1 cup'
) {
  throw new Error('Food serving Portions must retain display label independent of array order');
}
if (isLocalNodeId('persisted-meal') || !isLocalNodeId('local:meal-dinner')) {
  throw new Error('local node ids must be distinguishable from server ids');
}

const omitted = {
  ...plan,
  meals: plan.meals.filter((meal) => meal.id === 'persisted-meal'),
};
const omittedRequest = planToMenuRequest(omitted as typeof plan);
if (omittedRequest.meals.length !== 1 || omittedRequest.meals[0]?.id !== 'persisted-meal') {
  throw new Error('omitted Meals must leave the replacement payload');
}

if (moveId(['a', 'b', 'c'], 2, 0).join(',') !== 'c,a,b' || moveId(['a', 'b'], 0, 5).join(',') !== 'a,b') {
  throw new Error('Menu reorder must move ids by explicit position without wrapping');
}

console.log('nutrition-menu: all checks passed');
