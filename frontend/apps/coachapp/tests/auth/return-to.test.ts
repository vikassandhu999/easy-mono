import assert from 'node:assert/strict';
import {test} from 'node:test';
import {authPath, getReturnTo} from '../../src/auth/return-to.ts';

test('protected destinations keep their query and fragment through each authentication step', () => {
  const target = '/clients/client-id/check-in-responses?status=reviewed&search=weekly#answer';
  for (const step of ['/login', '/signup', '/verify', '/register-business']) {
    const url = new URL(authPath(step, target), 'https://coachapp.test');
    assert.equal(url.pathname, step);
    assert.equal(getReturnTo(url.search), target);
  }
  assert.equal(authPath('/login', '/'), '/login');
  assert.equal(getReturnTo(''), '/');
});

test('untrusted return addresses cannot escape the app or loop through public authentication', () => {
  for (const target of [
    'https://example.test/forms',
    '//example.test/forms',
    '/\\example.test/forms',
    'javascript:alert(1)',
    '/\n/forms',
    '/login',
    '/signup',
    '/verify?token=secret',
    '/accept-invite?token=secret',
    '/register-business',
    '/coaching/my-page',
    '/forms/../login',
    '/%6cogin',
    '/forms/%2e%2e/verify',
    '/missing-page',
    '/%E0%A4%A',
  ]) {
    const query = new URLSearchParams({returnTo: target});
    assert.equal(getReturnTo(query.toString()), '/', target);
    assert.equal(authPath('/login', target), '/login', target);
  }
});
