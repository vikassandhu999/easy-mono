import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formatRest, formatTarget, targetModes, targetPlaceholder} from '../src/targets.ts';

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

test('distance reads in km from 1 km and in metres below it', () => {
  assert.equal(formatTarget('distance', {mode: 'exact', value: 5000}), '5 km');
  assert.equal(formatTarget('distance', {mode: 'exact', value: 1500}), '1.5 km');
  assert.equal(formatTarget('distance', {mode: 'exact', value: 400}), '400 m');
  assert.equal(formatTarget('distance', {mode: 'range', min: 3000, max: 5000}), '3–5 km');
  assert.equal(formatTarget('distance', {mode: 'range', min: 800, max: 1200}), '800–1200 m');
});

test('placeholders hint the target in the input unit and are empty when the client chooses', () => {
  assert.equal(targetPlaceholder('reps', {mode: 'exact', value: 10}), '10');
  assert.equal(targetPlaceholder('distance', {mode: 'exact', value: 5000}), '5000');
  assert.equal(targetPlaceholder('duration', {mode: 'exact', value: 90}), '1:30');
  assert.equal(targetPlaceholder('duration', {mode: 'exact', value: 45}), '45');
  assert.equal(targetPlaceholder('reps', {mode: 'range', min: 8, max: 12}), '8–12');
  assert.equal(targetPlaceholder('reps', {mode: 'max'}), 'Max');
  assert.equal(targetPlaceholder('reps', {mode: 'client_chooses'}), '');
  assert.equal(targetPlaceholder('reps', undefined), '');
});
