import {dropEmptySlots, reindexSlotOptions, removeMealFromPatterns} from './plan-tree-mutations.ts';

const option = (mealId: string, position: number) => ({nutrition_meal_id: mealId, position});
const pattern: Parameters<typeof dropEmptySlots>[0] = {
  slots: [
    {meal_slot: 'breakfast', options: [option('oats', 4), option('eggs', 9)]},
    {meal_slot: 'lunch', options: []},
  ],
};

dropEmptySlots(pattern);
if (pattern.slots.length !== 1 || pattern.slots[0]?.meal_slot !== 'breakfast') {
  throw new Error('empty Menu slots must be removed');
}

reindexSlotOptions(pattern, 'breakfast');
if (pattern.slots[0]?.options[0]?.position !== 0 || pattern.slots[0]?.options[1]?.position !== 1) {
  throw new Error('Menu slot options must be reindexed from zero');
}

const plan: Parameters<typeof removeMealFromPatterns>[0] = {
  day_patterns: [pattern, {slots: [{meal_slot: 'dinner', options: [option('oats', 0)]}]}],
};
removeMealFromPatterns(plan, 'oats');
if (plan.day_patterns[0]?.slots[0]?.options.length !== 1 || plan.day_patterns[1]?.slots.length !== 0) {
  throw new Error('removing a Meal must remove every option and its newly empty slots');
}

console.log('nutrition plan-tree mutation checks passed');
