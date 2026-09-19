import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseSession} from '../../src/api/session-value.ts';

const session = {
  id: 'session-1',
  expiresAt: 1_800_000_000_000,
  tokens: {access_token: 'access', refresh_token: 'refresh', expires_in: 300, scope: 'client', token_type: 'Bearer'},
};

test('a complete persisted session can be restored', () => {
  assert.deepEqual(parseSession(JSON.stringify(session)), session);
});

test('corrupt or incomplete storage is treated as signed out', () => {
  for (const raw of [
    null,
    '',
    '{',
    '{}',
    'null',
    JSON.stringify({...session, tokens: {...session.tokens, refresh_token: ''}}),
  ]) {
    assert.equal(parseSession(raw), null);
  }
});

test('expired access tokens remain available for session refresh', () => {
  const expired = {...session, expiresAt: 1};
  assert.deepEqual(parseSession(JSON.stringify(expired)), expired);
});

test('invalid token lifetimes cannot enter the session store', () => {
  assert.equal(parseSession(JSON.stringify({...session, tokens: {...session.tokens, expires_in: -1}})), null);
});
