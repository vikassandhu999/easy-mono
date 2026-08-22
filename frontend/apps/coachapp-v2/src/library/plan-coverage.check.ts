import {periodError} from './plan-coverage.ts';

if (periodError('2026-08-06', null) || periodError(null, '2026-09-05') || periodError('2026-08-06', '2026-09-05')) {
  throw new Error('open and ordered Coverage must be valid');
}
if (!periodError('2026-08-06', '2026-08-05')) {
  throw new Error('reversed Coverage must be rejected');
}

console.log('plan Coverage checks passed');
