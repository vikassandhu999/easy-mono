import {changeOptionSlot, copyWithItemPortion} from './commands-state.ts';

const sameSlotPlan = {
  day_patterns: [
    {
      id: 'day',
      slots: [
        {
          meal_slot: 'breakfast',
          options: [{id: 'option', nutrition_meal_id: 'meal', position: 0}],
        },
      ],
    },
  ],
} satisfies Parameters<typeof changeOptionSlot>[0];

changeOptionSlot(sameSlotPlan, 'day', 'option', 'breakfast');
if (sameSlotPlan.day_patterns[0]?.slots[0]?.options[0]?.id !== 'option') {
  throw new Error('reselecting the current Meal Slot must preserve its option');
}

const frozenPlan = {
  meals: [
    {
      id: 'meal',
      meal_items: [
        {
          id: 'item',
          portion: {kind: 'gram', grams: 50, amount: null, unit: null, label: null},
        },
      ],
    },
  ],
} satisfies Parameters<typeof copyWithItemPortion>[0];
Object.freeze(frozenPlan.meals[0]?.meal_items[0]?.portion);
Object.freeze(frozenPlan.meals[0]?.meal_items[0]);
Object.freeze(frozenPlan.meals[0]?.meal_items);
Object.freeze(frozenPlan.meals[0]);
Object.freeze(frozenPlan.meals);
Object.freeze(frozenPlan);

const copied = copyWithItemPortion(frozenPlan, 'item', {
  kind: 'gram',
  grams: 75,
  amount: null,
  unit: null,
  label: null,
});

if (copied?.meals[0]?.meal_items[0]?.portion.grams !== 75 || frozenPlan.meals[0]?.meal_items[0]?.portion.grams !== 50) {
  throw new Error('debounced item writes must copy frozen cache data before changing the Portion');
}

console.log('nutrition builder commands: all checks passed');
