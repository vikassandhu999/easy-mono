import {coachClientTrainingSessionHistoryRequest} from './training-sessions.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const history = coachClientTrainingSessionHistoryRequest('client-1', {
  from: '2026-08-01',
  to: '2026-08-15',
  limit: 20,
  offset: 0,
});

assert(history.params.path.client_id === 'client-1', 'coach history names the client in the path');
assert(history.params.query?.from === '2026-08-01', 'coach history sends inclusive from dates');
assert(history.params.query?.to === '2026-08-15', 'coach history sends inclusive to dates');
assert(history.params.query?.limit === 20, 'coach history pages with the generated limit');
assert(history.params.query?.offset === 0, 'coach history pages with the generated offset');
