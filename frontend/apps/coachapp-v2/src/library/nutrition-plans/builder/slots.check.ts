import {flattenSlots, MEAL_SLOTS, ORDINARY_MEAL_SLOTS, slotLabel, WORKOUT_MEAL_SLOTS} from './slots.ts';

if (MEAL_SLOTS.join(',') !== [...ORDINARY_MEAL_SLOTS, ...WORKOUT_MEAL_SLOTS].join(',')) {
  throw new Error('Meal Slots must be ordinary day-period slots followed by the workout group');
}
if (slotLabel('mid_morning') !== 'After breakfast' || slotLabel('afternoon') !== 'After lunch') {
  throw new Error('relative day-period slots keep their display copy');
}
if (slotLabel('pre_sleep') !== 'Before sleep' || slotLabel('post_workout') !== 'After workout') {
  throw new Error('sleep- and workout-relative slots keep their display copy');
}

const flattened = flattenSlots({
  slots: [
    {meal_slot: 'post_workout', options: [{id: 'post', position: 0, nutrition_meal_id: 'shake'}]},
    {
      meal_slot: 'breakfast',
      options: [
        {id: 'default', position: 0, nutrition_meal_id: 'oats'},
        {id: 'swap', position: 1, nutrition_meal_id: 'eggs'},
      ],
    },
  ],
});
if (
  flattened.length !== 3 ||
  flattened[0]?.meal_slot !== 'breakfast' ||
  flattened[0]?.nutrition_meal_id !== 'oats' ||
  flattened[1]?.nutrition_meal_id !== 'eggs' ||
  flattened[2]?.meal_slot !== 'post_workout'
) {
  throw new Error('flattenSlots must emit canonical ordinary-then-workout order');
}

console.log('nutrition slots: all checks passed');
