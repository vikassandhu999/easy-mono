import assert from 'node:assert/strict';
import {basisLabel, body, fields} from '../../src/foods/food.ts';

const draft = fields();
draft.name = '  Oats  ';
draft.nutrients = {energy_kcal: '380', protein_g: '', fiber_g: '0'};
Object.assign(draft.nutrients, {fat_g: undefined});
draft.servings = [{label: ' bowl ', amount: '40'}];
assert.deepEqual(
  body(draft),
  {
    name: 'Oats',
    kind: 'food',
    basis: '100g',
    unit_label: null,
    nutrients: {energy_kcal: 380, fiber_g: 0},
    servings: [{label: 'bowl', amount: 40}],
  },
  'Saving a food preserves known zero and omits unknown nutrients',
);
assert.deepEqual(
  body({
    ...draft,
    kind: 'supplement',
    basis: '1unit',
    unit_label: ' capsule ',
    nutrients: {vitamin_d_ug: '25'},
    servings: [{label: 'dose', amount: '2'}],
  }),
  {
    name: 'Oats',
    kind: 'supplement',
    basis: '1unit',
    unit_label: 'capsule',
    nutrients: {vitamin_d_ug: 25},
    servings: [{label: 'dose', amount: 2}],
  },
  'A supplement serving counts the selected basis units',
);
assert.equal(basisLabel({basis: '100ml', unit_label: null}), '100 ml');
assert.equal(basisLabel({basis: '1unit', unit_label: 'tablet'}), '1 tablet');
