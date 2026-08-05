import {periodError} from './period.ts';
import {parseRpe, parseWholeNumber} from './sets.ts';

for (const value of ['', '0', '90']) {
  if (parseWholeNumber(value) === undefined) {
    throw new Error(`whole number should accept ${value}`);
  }
}
for (const value of ['-1', '1.5', '9x']) {
  if (parseWholeNumber(value) !== undefined) {
    throw new Error(`whole number should reject ${value}`);
  }
}
for (const value of ['', '1', '8.5', '10']) {
  if (parseRpe(value) === undefined) {
    throw new Error(`RPE should accept ${value}`);
  }
}
for (const value of ['0', '8.', '11', 'x']) {
  if (parseRpe(value) !== undefined) {
    throw new Error(`RPE should reject ${value}`);
  }
}

if (periodError('2026-08-06', null) || periodError(null, '2026-09-05') || periodError('2026-08-06', '2026-09-05')) {
  throw new Error('open and ordered plan periods must be valid');
}
if (!periodError('2026-08-06', '2026-08-05')) {
  throw new Error('reversed plan periods must be rejected');
}

console.log('training-plan-sets: all checks passed');
