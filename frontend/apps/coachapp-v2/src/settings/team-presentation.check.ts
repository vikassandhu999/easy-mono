import {memberName, STATUS_COLOR, STATUS_LABEL} from './team-presentation.ts';

const assert = (ok: unknown, message: string) => {
  if (!ok) {
    throw new Error(message);
  }
};

assert(
  memberName({email: 'sam@example.com', first_name: 'Sam', last_name: 'Reed'}) === 'Sam Reed',
  'both names read as a full name',
);
assert(
  memberName({email: 'sam@example.com', first_name: 'Sam', last_name: null}) === 'Sam',
  'a first name alone is enough',
);
assert(
  memberName({email: 'sam@example.com', first_name: null, last_name: null}) === 'sam@example.com',
  'no name falls back to the invite email',
);
assert(memberName({email: '', first_name: null, last_name: null}) === 'Trainer', 'nothing at all still renders a noun');

for (const status of ['invited', 'active', 'inactive'] as const) {
  assert(STATUS_LABEL[status], `every status has a label (${status})`);
  assert(STATUS_COLOR[status], `every status has a colour (${status})`);
}

console.log('team-presentation checks passed');
