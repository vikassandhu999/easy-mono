import {isOneOf} from './closed-vocabulary.ts';

const TABS = ['overview', 'nutrition'] as const;

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

check(isOneOf(TABS, 'overview'), 'a member is a member');
check(!isOneOf(TABS, 'billing'), 'a non-member is rejected');
check(!isOneOf(TABS, null), 'null is rejected');
check(!isOneOf(TABS, undefined), 'a missing key is rejected');
// A react-aria selection Key is `string | number`; a numeric one is never a member.
check(!isOneOf(TABS, 0), 'a numeric key is rejected');

console.log('closed-vocabulary checks passed');
