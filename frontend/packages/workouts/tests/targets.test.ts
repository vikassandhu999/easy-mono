import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formatRest, formatTarget, targetModes} from '../src/targets.ts';

test('rest none is None and client-chosen rest is Any', () => {
  assert.equal(formatRest({mode: 'none'}), 'None');
  assert.equal(formatRest({mode: 'client_chooses'}), 'Any');
});

test('rest formats canonical seconds without changing the target', () => {
  const rest = {mode: 'range' as const, min_s: 60, max_s: 90};
  assert.equal(formatRest(rest), '1:00–1:30');
  assert.equal(formatRest({mode: 'exact', value_s: 0}), '0:00');
  assert.equal(formatRest({mode: 'exact', value_s: 90.5}), '1:30.5');
  assert.deepEqual(rest, {mode: 'range', min_s: 60, max_s: 90});
});

test('missing and client-chosen targets stay Any rather than becoming zero', () => {
  assert.equal(formatTarget('reps', null), 'Any');
  assert.equal(formatTarget('reps', undefined), 'Any');
  assert.equal(formatTarget('reps', {mode: 'client_chooses'}), 'Any');
  assert.equal(formatTarget('reps', {mode: 'exact', value: 0}), '0');
});

test('numeric and text instructions retain their values and modes', () => {
  assert.equal(formatTarget('weight', {mode: 'exact', value: -12.5}), '-12.5 kg');
  assert.equal(formatTarget('reps', {mode: 'range', min: 8, max: 12}), '8–12');
  assert.equal(formatTarget('reps', {mode: 'max'}), 'Max');
  assert.equal(formatTarget('tempo', {mode: 'exact', value: '3-1-1-0'}), '3-1-1-0');
  assert.equal(formatTarget('result', {mode: 'exact', value: 'win'}), 'Win');
});

test('result and tempo allow exact or client choice while numeric metrics allow ranges and max', () => {
  assert.deepEqual(targetModes('result'), ['client_chooses', 'exact']);
  assert.deepEqual(targetModes('tempo'), ['client_chooses', 'exact']);
  assert.deepEqual(targetModes('reps'), ['client_chooses', 'exact', 'range', 'max']);
});
