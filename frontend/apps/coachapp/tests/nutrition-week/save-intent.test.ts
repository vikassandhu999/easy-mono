import assert from 'node:assert/strict';
import type {Food} from '../../src/api/foods.ts';
import type {NutritionPreset, NutritionSchedule, NutritionWeek} from '../../src/api/nutrition-week.ts';
import {matchSaveIntent, presetBodyOf, type SaveIntent} from '../../src/nutrition-week/save-intent.ts';

const oats: Food = {
  id: 'oats',
  name: 'Oats',
  kind: 'food',
  basis: '100g',
  unit_label: null,
  nutrients: {},
  servings: [],
  inserted_at: '',
  updated_at: '',
};
const breakfast: NutritionPreset = {
  id: 'breakfast',
  type: 'meal',
  name: 'Breakfast',
  instructions: null,
  food_id: null,
  amount: null,
  unit: null,
  food: null,
  totals: null,
  options: [
    {
      id: 'option',
      name: 'Oats bowl',
      position: 0,
      totals: {},
      items: [{id: 'item', food_id: 'oats', amount: 60, unit: 'g', position: 0, food: oats, nutrients: {}}],
    },
  ],
};
const supplement: NutritionPreset = {
  ...breakfast,
  id: 'pill',
  type: 'supplement',
  name: null,
  options: [],
  food: {...oats, id: 'capsule', kind: 'supplement', basis: '1unit', unit_label: 'capsule'},
  food_id: 'capsule',
  amount: 1,
  unit: 'unit',
  totals: {},
};
const schedule = (id: string, preset: string, mask: number, time: string | null): NutritionSchedule => ({
  id,
  nutrition_preset_id: preset,
  weekdays_mask: mask,
  date: null,
  from_date: '2026-10-01',
  until_date: null,
  time,
  coach_id: 'coach',
});
const before: NutritionWeek = {
  today: '2026-10-12',
  nutrients: [],
  presets: [breakfast, supplement],
  schedules: [
    schedule('weekday', 'breakfast', 31, '08:00:00'),
    schedule('weekend', 'breakfast', 96, '10:30:00'),
    schedule('daily-pill', 'pill', 127, null),
  ],
  nutrition_targets: [
    {id: 'training', name: 'Training day', targets: {energy_kcal: {min: 2500, max: 2700}, protein_g: {min: 160}}},
    {id: 'rest', name: 'Rest day', targets: {energy_kcal: {min: 2200, max: 2200}}},
  ],
  target_schedules: [
    {
      id: 'training-days',
      nutrition_targets_id: 'training',
      weekdays_mask: 21,
      date: null,
      from_date: '2026-10-01',
      until_date: null,
    },
    {
      id: 'rest-days',
      nutrition_targets_id: 'rest',
      weekdays_mask: 106,
      date: null,
      from_date: '2026-10-01',
      until_date: null,
    },
  ],
};

const newMeal = {...breakfast, id: 'new-meal', name: 'New breakfast'};
const add: SaveIntent = {
  kind: 'add',
  before,
  body: {preset: {...presetBodyOf(newMeal), instructions: ''}, weekdays_mask: 1, time: '07:15'},
};
assert.equal(matchSaveIntent(add, before), 'absent');
const added = {
  ...before,
  presets: [...before.presets, newMeal],
  schedules: [...before.schedules, schedule('added', newMeal.id, 1, '07:15:00')],
};
assert.equal(matchSaveIntent(add, added), 'saved');
assert.equal(
  matchSaveIntent(add, {...added, schedules: [...before.schedules, schedule('added', newMeal.id, 1, '07:15:30')]}),
  'conflict',
);
assert.equal(
  matchSaveIntent(add, {...added, schedules: [...added.schedules, schedule('duplicate', newMeal.id, 1, '07:15:00')]}),
  'conflict',
);
assert.equal(
  matchSaveIntent(add, {...added, presets: [...before.presets, {...newMeal, name: 'Different meal'}]}),
  'conflict',
);
assert.equal(
  matchSaveIntent(
    {kind: 'add', before, body: {nutrition_preset_id: 'breakfast', weekdays_mask: 1, time: null}},
    {...before, schedules: [...before.schedules, schedule('extra', 'breakfast', 1, null)]},
  ),
  'saved',
);

const edited = {...breakfast, id: 'edited-breakfast', name: 'Morning fuel'};
const meal: SaveIntent = {kind: 'meal', before, id: breakfast.id, body: presetBodyOf(edited)};
const mealSaved = {
  ...before,
  presets: [edited, supplement],
  schedules: before.schedules.map((row) =>
    row.nutrition_preset_id === breakfast.id
      ? {...row, id: `${row.id}-new`, nutrition_preset_id: edited.id, from_date: before.today}
      : row,
  ),
};
assert.equal(matchSaveIntent(meal, before), 'absent');
assert.equal(matchSaveIntent(meal, mealSaved), 'saved');
assert.equal(
  matchSaveIntent(meal, {
    ...mealSaved,
    schedules: mealSaved.schedules.map((row) => ({...row, coach_id: 'another-coach'})),
  }),
  'saved',
);
assert.equal(
  matchSaveIntent(meal, {...mealSaved, schedules: mealSaved.schedules.filter((row) => row.weekdays_mask !== 96)}),
  'conflict',
);
const alreadyHadAnother = {...before, presets: [...before.presets, {...edited, id: 'other-meal'}]};
assert.equal(matchSaveIntent({...meal, before: alreadyHadAnother}, alreadyHadAnother), 'absent');
assert.equal(
  matchSaveIntent(meal, {...before, presets: [{...breakfast, name: 'Changed by someone else'}, supplement]}),
  'conflict',
);

const timing: SaveIntent = {kind: 'schedule', before, id: 'weekday', body: {time: null, weekdays_mask: 30}};
assert.equal(matchSaveIntent(timing, before), 'absent');
assert.equal(
  matchSaveIntent(timing, {
    ...before,
    schedules: before.schedules.map((row) =>
      row.id === 'weekday' ? {...row, id: 'new-weekday', time: null, weekdays_mask: 30} : row,
    ),
  }),
  'saved',
);
assert.equal(
  matchSaveIntent(timing, {
    ...before,
    schedules: before.schedules.map((row) => (row.id === 'weekday' ? {...row, time: '11:00:00'} : row)),
  }),
  'conflict',
);
const amount: SaveIntent = {kind: 'schedule', before, id: 'daily-pill', body: {amount: 2, unit: 'unit'}};
assert.equal(
  matchSaveIntent(amount, {
    ...before,
    presets: [breakfast, {...supplement, id: 'new-pill', amount: 2}],
    schedules: before.schedules.map((row) =>
      row.id === 'daily-pill' ? {...row, id: 'new-daily-pill', nutrition_preset_id: 'new-pill'} : row,
    ),
  }),
  'saved',
);
assert.equal(matchSaveIntent(amount, before), 'absent');

const remove: SaveIntent = {kind: 'remove', before, id: 'weekday', weekday: 1};
const removed = {
  ...before,
  schedules: before.schedules.map((row) =>
    row.id === 'weekday' ? {...row, id: 'remaining-weekdays', weekdays_mask: 30} : row,
  ),
};
assert.equal(matchSaveIntent(remove, removed), 'saved');
assert.equal(matchSaveIntent(remove, before), 'absent');
const withAnotherMonday = {
  ...before,
  schedules: [...before.schedules, schedule('second-monday', 'breakfast', 1, '08:00:00')],
};
assert.equal(
  matchSaveIntent(
    {...remove, before: withAnotherMonday},
    {...removed, schedules: [...removed.schedules, schedule('second-monday', 'breakfast', 1, '08:00:00')]},
  ),
  'saved',
);
assert.equal(
  matchSaveIntent(
    {kind: 'remove', before, id: 'daily-pill', weekday: 1},
    {
      ...before,
      schedules: before.schedules.map((row) => (row.id === 'daily-pill' ? {...row, weekdays_mask: 126} : row)),
    },
  ),
  'saved',
);

const copiedSet = {id: 'copy', name: 'Monday targets', targets: {energy_kcal: {min: 2800, max: 3000}}};
const targets: SaveIntent = {
  kind: 'targets',
  before,
  weekday: 1,
  body: {nutrition_targets_id: null, new_targets: {name: copiedSet.name, targets: copiedSet.targets}},
};
const targetsCopied = {
  ...before,
  nutrition_targets: [...before.nutrition_targets, copiedSet],
  target_schedules: [
    ...before.target_schedules.map((row) =>
      row.nutrition_targets_id === 'training' ? {...row, id: 'remaining-training', weekdays_mask: 20} : row,
    ),
    {
      id: 'monday-copy',
      nutrition_targets_id: 'copy',
      weekdays_mask: 1,
      date: null,
      from_date: before.today,
      until_date: null,
    },
  ],
};
assert.equal(matchSaveIntent(targets, before), 'absent');
assert.equal(matchSaveIntent(targets, targetsCopied), 'saved');
assert.equal(
  matchSaveIntent(targets, {
    ...targetsCopied,
    nutrition_targets: [...before.nutrition_targets, {...copiedSet, targets: {energy_kcal: {min: 2500}}}],
  }),
  'conflict',
);
const updatedTargets = {id: 'updated-training', name: 'Training day', targets: {protein_g: {min: 175}}};
const sharedTargets: SaveIntent = {
  kind: 'targets',
  before,
  weekday: 1,
  body: {
    nutrition_targets_id: 'training',
    target_updates: [{id: 'training', name: updatedTargets.name, targets: updatedTargets.targets}],
  },
};
assert.equal(
  matchSaveIntent(sharedTargets, {
    ...before,
    nutrition_targets: [updatedTargets, before.nutrition_targets[1]],
    target_schedules: before.target_schedules.map((row) =>
      row.nutrition_targets_id === 'training'
        ? {...row, id: 'new-training-days', nutrition_targets_id: updatedTargets.id}
        : row,
    ),
  }),
  'saved',
);
assert.equal(matchSaveIntent(sharedTargets, before), 'absent');
const removeTargets: SaveIntent = {kind: 'targets', before, weekday: 1, body: {nutrition_targets_id: null}};
assert.equal(
  matchSaveIntent(removeTargets, {
    ...before,
    target_schedules: before.target_schedules.map((row) =>
      row.nutrition_targets_id === 'training' ? {...row, weekdays_mask: 20} : row,
    ),
  }),
  'saved',
);
assert.equal(matchSaveIntent(removeTargets, before), 'absent');
console.log(
  'Nutrition save recovery distinguishes matching persisted intent, unchanged absence, and conflicting writes across history ids.',
);
