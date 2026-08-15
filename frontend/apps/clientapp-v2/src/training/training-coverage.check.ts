import type {ClientTrainingCoverageResponse} from '../api/training.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const noCoverage = {data: null} satisfies ClientTrainingCoverageResponse;

assert(noCoverage.data === null, 'missing Coverage stays a successful nullable API result');
