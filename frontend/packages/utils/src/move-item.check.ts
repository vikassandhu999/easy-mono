import {moveItem} from './move-item.ts';

const assert = (ok: unknown, message: string) => {
  if (!ok) {
    throw new Error(message);
  }
};

assert(moveItem(['a', 'b', 'c'], 2, 0).join(',') === 'c,a,b', 'moves an element to an earlier index');
assert(moveItem(['a', 'b', 'c'], 0, 2).join(',') === 'b,c,a', 'moves an element to a later index');
assert(moveItem(['a', 'b', 'c'], 0, 1).join(',') === 'b,a,c', 'an adjacent move is a swap');
const same = ['a', 'b'];
assert(moveItem(same, 0, 5) === same, 'an out-of-range destination returns the original list');
assert(moveItem(same, 9, 0) === same, 'an out-of-range source returns the original list');
assert(moveItem(same, 0, -1) === same, 'a negative destination returns the original list');

console.log('move-item checks passed');
