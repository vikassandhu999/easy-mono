import assert from 'node:assert/strict';
import {test} from 'node:test';
import {type DraftStorage, loadDurableDraft} from '../src/use-durable-draft.ts';

function storage(raw: unknown, removes = true) {
  let value = raw;
  const adapter: DraftStorage = {
    getOwner: () => 'owner',
    read: async () => value,
    write: async (_owner, _resource, next) => {
      value = next;
    },
    remove: async () => {
      if (!removes) {
        throw new Error('Unavailable');
      }
      value = null;
    },
  };
  return {adapter, value: () => value};
}
const parse = (raw: unknown) =>
  raw !== null && typeof raw === 'object' && 'name' in raw && typeof raw.name === 'string' ? {name: raw.name} : null;

test('corrupt drafts are removed and server-backed initial state remains available', async () => {
  for (const raw of ['{bad', {wrong: true}, '']) {
    const state = storage(raw);
    assert.deepEqual(await loadDurableDraft(state.adapter, 'owner', 'resource', {name: 'Saved'}, parse), {
      draft: {name: 'Saved'},
      failure: 'parse',
    });
    assert.equal(state.value(), null);
  }
});
test('valid drafts survive and cleanup errors cannot block the saved server record', async () => {
  const valid = storage({name: 'Device edit'});
  assert.deepEqual(await loadDurableDraft(valid.adapter, 'owner', 'resource', {name: 'Saved'}, parse), {
    draft: {name: 'Device edit'},
    failure: null,
  });
  assert.deepEqual(valid.value(), {name: 'Device edit'});
  const blocked = storage('{bad', false);
  assert.deepEqual(await loadDurableDraft(blocked.adapter, 'owner', 'resource', {name: 'Saved'}, parse), {
    draft: {name: 'Saved'},
    failure: 'parse',
  });
  const unreadable = {
    ...valid.adapter,
    read: async () => {
      throw new Error('Unavailable');
    },
  };
  assert.deepEqual(await loadDurableDraft(unreadable, 'owner', 'resource', {name: 'Saved'}, parse), {
    draft: {name: 'Saved'},
    failure: 'read',
  });
});
