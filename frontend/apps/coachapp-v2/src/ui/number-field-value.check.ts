import {z} from 'zod';

import {numberFieldSchema, toNumberFieldValue} from './number-field-value.ts';

if (toNumberFieldValue(undefined) !== '') {
  throw new Error('a cleared controlled number field must emit an explicit empty value');
}
if (toNumberFieldValue(0) !== 0) {
  throw new Error('zero must remain a valid controlled number value');
}

const optionalNumber = numberFieldSchema(z.number().min(0).optional());
const cleared = optionalNumber.safeParse('');
if (!cleared.success || cleared.data !== undefined) {
  throw new Error('the schema boundary must normalize an empty number field to undefined');
}
if (!optionalNumber.safeParse(0).success || optionalNumber.safeParse(-1).success) {
  throw new Error('number constraints must survive empty-value normalization');
}

const requiredNumber = numberFieldSchema(z.number().min(1));
if (requiredNumber.safeParse('').success) {
  throw new Error('a required number must still reject the empty sentinel');
}

console.log('number-field-value: all checks passed');
