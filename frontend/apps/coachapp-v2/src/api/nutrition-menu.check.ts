import {isLocalNodeId, moveId, planToMenuRequest, reorderNodes} from './nutrition-menu.ts';

const plan = {
  revision: 4,
  schedule: {
    monday: 'pattern-id',
    tuesday: 'pattern-id',
    wednesday: 'pattern-id',
    thursday: 'pattern-id',
    friday: 'pattern-id',
    saturday: 'pattern-id',
    sunday: 'pattern-id',
  },
  day_patterns: [
    {
      id: 'pattern-id',
      name: 'Everyday',
      position: 0,
      weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      slots: [
        {
          meal_slot: 'breakfast',
          options: [{id: 'option-id', position: 0, nutrition_meal_id: 'persisted-meal'}],
        },
        {
          meal_slot: 'dinner',
          options: [{id: 'local:option-dinner', position: 0, nutrition_meal_id: 'local:meal-dinner'}],
        },
      ],
    },
  ],
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
if (request.day_patterns[0]?.id !== 'pattern-id' || request.day_patterns[0]?.slots[0]?.meal_slot !== 'breakfast') {
  throw new Error('persisted Day Patterns must retain server identity and slot placement');
}
if (
  request.day_patterns[0]?.slots[1]?.options[0]?.local_ref !== 'option-dinner' ||
  request.day_patterns[0]?.slots[1]?.options[0]?.meal_local_ref !== 'meal-dinner'
) {
  throw new Error('new Meal Options must use request-local identity and meal references');
}
if (request.schedule.monday !== 'pattern-id' || request.schedule.sunday !== 'pattern-id') {
  throw new Error('Week Schedule must reference persisted Day Pattern ids');
}

const everyday = plan.day_patterns[0];
if (!everyday) {
  throw new Error('fixture needs a Day Pattern');
}
const restPattern = {
  ...everyday,
  id: 'local:pattern-rest',
  name: 'Rest',
  position: 1,
  weekdays: [],
  slots: [],
};
const reordered = planToMenuRequest({
  ...plan,
  day_patterns: reorderNodes([everyday, restPattern], 1, 0),
  schedule: {
    ...plan.schedule,
    saturday: restPattern.id,
    sunday: restPattern.id,
  },
});
if (
  reordered.day_patterns[0]?.local_ref !== 'pattern-rest' ||
  reordered.day_patterns[0]?.position !== 0 ||
  reordered.day_patterns[1]?.id !== 'pattern-id' ||
  reordered.day_patterns[1]?.position !== 1 ||
  reordered.schedule.saturday !== 'pattern-rest' ||
  reordered.schedule.monday !== 'pattern-id'
) {
  throw new Error('Day Pattern reorder must send contiguous positions through one Menu replacement');
}

const defaultOption = everyday.slots[0]?.options[0];
if (!defaultOption) {
  throw new Error('fixture needs a Meal Option');
}
const breakfastOptions = [
  defaultOption,
  {...defaultOption, id: 'local:option-swap', position: 1, nutrition_meal_id: 'local:meal-dinner'},
];
const promoted = planToMenuRequest({
  ...plan,
  day_patterns: [
    {
      ...everyday,
      slots: [{meal_slot: 'breakfast', options: reorderNodes(breakfastOptions, 1, 0)}],
    },
  ],
});
if (
  promoted.day_patterns[0]?.slots[0]?.options[0]?.local_ref !== 'option-swap' ||
  promoted.day_patterns[0]?.slots[0]?.options[0]?.position !== 0 ||
  promoted.day_patterns[0]?.slots[0]?.options[0]?.meal_local_ref !== 'meal-dinner' ||
  promoted.day_patterns[0]?.slots[0]?.options[1]?.id !== 'option-id' ||
  promoted.day_patterns[0]?.slots[0]?.options[1]?.position !== 1
) {
  throw new Error('Meal Option reorder must promote position zero as the default in one Menu replacement');
}

try {
  planToMenuRequest({...plan, schedule: {...plan.schedule, sunday: null}});
  throw new Error('incomplete Week Schedule must not serialize');
} catch (error) {
  if (!(error instanceof Error) || error.message !== 'Day Pattern schedule is incomplete') {
    throw error;
  }
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
