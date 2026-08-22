import {EXERCISE_FORM_DEFAULTS, exerciseFormSchema} from './exercise-form-schema.ts';

function parses(patch: Partial<typeof EXERCISE_FORM_DEFAULTS>) {
  return exerciseFormSchema.safeParse({...EXERCISE_FORM_DEFAULTS, ...patch});
}

if (parses({name: '   '}).success) {
  throw new Error('exercise name must reject whitespace-only input');
}
if (!parses({name: 'x'.repeat(255)}).success) {
  throw new Error('exercise name must accept the API limit');
}
if (parses({name: 'x'.repeat(256)}).success) {
  throw new Error('exercise name must reject input beyond the API limit');
}
if (parses({name: 'Valid', description: 'x'.repeat(5001)}).success) {
  throw new Error('exercise description must mirror the API limit');
}
if (parses({name: 'Valid', instructions: 'x'.repeat(10_001)}).success) {
  throw new Error('exercise instructions must mirror the API limit');
}

const trimmed = parses({name: '  Test Exercise  '});
if (!trimmed.success || trimmed.data.name !== 'Test Exercise') {
  throw new Error('exercise name must be normalized before submission');
}

console.log('exercise-form-schema: all checks passed');
