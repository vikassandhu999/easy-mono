import type {components} from '../src/api/schema.ts';
import {
  clientTrainingCoverageRequest,
  clientTrainingPlanFromCoverage,
  clientTrainingSessionCompleteRequest,
  clientTrainingSessionDiscardRequest,
  clientTrainingSessionHistoryRequest,
} from '../src/api/training-requests.ts';

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

const complete = clientTrainingSessionCompleteRequest({
  id: 'session-1',
  notes: 'Great',
  soreness_rating: 4,
});
assert(complete.params.path.id === 'session-1', 'complete commands name the Training Session in the path');
assert(complete.body.notes === 'Great', 'complete may send notes captured while the session is still active');
assert(complete.body.soreness_rating === 4, 'complete may send soreness captured while the session is still active');
assert(!('state' in complete.body), 'complete must not mutate state through the generic update body');
assert(!('ended_at' in complete.body), 'closing time is server-owned');

const discard = clientTrainingSessionDiscardRequest({id: 'session-1'});
assert(discard.params.path.id === 'session-1', 'discard commands name the Training Session in the path');

const history = clientTrainingSessionHistoryRequest({from: '2026-08-01', to: '2026-08-15', limit: 20, offset: 0});
assert(history.params.query.from === '2026-08-01', 'history reads send inclusive from dates');
assert(history.params.query.to === '2026-08-15', 'history reads send inclusive to dates');
assert(history.params.query.limit === 20, 'history reads page with the generated limit');
assert(history.params.query.offset === 0, 'history reads page with the generated offset');
