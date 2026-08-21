import {liveOptionItems, slotLabel} from './nutrition-day.ts';

const breakfast = {meal_id: 'breakfast', items: [{id: 'oats'}]};
const alternate = {meal_id: 'alternate', items: [{id: 'eggs'}]};

if (liveOptionItems({meal_id: 'alternate', options: [breakfast, alternate]})[0]?.id !== 'eggs') {
  throw new Error('live Nutrition Day slots must use the selected option');
}
if (liveOptionItems({meal_id: 'missing', options: [breakfast, alternate]})[0]?.id !== 'oats') {
  throw new Error('live Nutrition Day slots must fall back to the first option');
}
if (liveOptionItems({meal_id: null, options: []}).length !== 0) {
  throw new Error('live Nutrition Day slots without options must be empty');
}
if (slotLabel('mid_morning') !== 'After breakfast') {
  throw new Error('Meal Slot labels must map known values');
}

console.log('coach nutrition-day checks passed');
