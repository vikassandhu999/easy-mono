import assert from 'node:assert/strict';
import {portionNutrients} from '../../src/nutrition/library-portions.ts';

assert.deepEqual(portionNutrients({energy_kcal: 200, protein_g: 0}, 30), {energy_kcal: 60, protein_g: 0});
assert.equal(portionNutrients({energy_kcal: 200}, 30).fiber_g, undefined);
