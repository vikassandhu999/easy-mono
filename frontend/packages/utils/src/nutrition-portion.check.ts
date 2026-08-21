import {
  formatParsedPortion,
  parseNutritionPortion,
  portionWireFromInput,
  toPortionInput,
  toPortionWire,
} from './nutrition-portion.ts';

const gram = parseNutritionPortion({amount: 5, grams: 100, kind: 'gram', label: 'cup', unit: 'cup'});
if (gram?.kind !== 'gram' || gram.grams !== 100) {
  throw new Error('gram portions must ignore sibling fields');
}

if (parseNutritionPortion({amount: 1, grams: null, kind: 'gram', label: null, unit: null}) !== null) {
  throw new Error('gram portions with null grams must not parse');
}

if (formatParsedPortion({grams: 50, kind: 'gram'}) !== '50g') {
  throw new Error('gram portions must format with a g suffix');
}

const serving = parseNutritionPortion({amount: 2, grams: null, kind: 'serving', label: '1 cup', unit: 'cup'});
if (serving?.kind !== 'serving' || serving.amount !== 2) {
  throw new Error('serving portions must require amount and unit');
}

const roundTrip = toPortionWire(toPortionInput({amount: 1, kind: 'serving', label: '1 cup', unit: 'cup'}));
if (roundTrip.kind !== 'serving' || roundTrip.grams !== null) {
  throw new Error('serving wire shapes must null out gram fields');
}

const normalized = portionWireFromInput({grams: 80, kind: 'gram'});
if (normalized.grams !== 80 || normalized.amount !== null) {
  throw new Error('input normalization must produce canonical wire shapes');
}
