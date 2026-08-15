import {
  clientTrainingCoverageRequest,
  clientTrainingPlanFromCoverage,
} from '../src/api/training-coverage.ts';
import type {components} from '../src/api/schema.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const datedRequest = clientTrainingCoverageRequest('2026-08-15');
assert(datedRequest.params.query.date === '2026-08-15', 'the requested UTC date reaches the coverage query');

const todayRequest = clientTrainingCoverageRequest();
assert(!('date' in todayRequest.params.query), 'an omitted date lets the server resolve UTC today');

const noCoverage = {data: null} satisfies components['schemas']['ClientTrainingCoverageResponse'];
assert(clientTrainingPlanFromCoverage(noCoverage) === undefined, 'nullable Coverage selects the no-plan UI state');
