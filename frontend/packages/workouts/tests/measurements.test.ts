import assert from 'node:assert/strict';
import {test} from 'node:test';
import {measurementFields, parseMeasurement} from '../src/measurements.ts';

test('an empty measurement is unknown while zero remains a supplied result', () => {
  assert.deepEqual(parseMeasurement('weight', '', 'kg'), {ok: true, value: null});
  assert.deepEqual(parseMeasurement('weight', '  ', 'kg'), {ok: true, value: null});
  assert.deepEqual(parseMeasurement('reps', '0'), {ok: true, value: 0});
});

test('fractional repetitions and effort above ten are rejected', () => {
  assert.equal(parseMeasurement('reps', '2.5').ok, false);
  assert.equal(parseMeasurement('effort', '11').ok, false);
  assert.equal(parseMeasurement('effort', '0').ok, false);
  assert.equal(parseMeasurement('level', '0').ok, false);
  assert.deepEqual(parseMeasurement('reserve', '0'), {ok: true, value: 0});
  assert.deepEqual(parseMeasurement('effort', '10'), {ok: true, value: 10});
});

test('pounds convert to canonical kilograms', () => {
  const parsed = parseMeasurement('weight', '100', 'lb');
  assert.ok(parsed.ok);
  assert.equal(typeof parsed.value, 'number');
  assert.ok(Math.abs(Number(parsed.value) - 45.359237) < 0.000001);
});

test('minutes and clock input convert to decimal seconds', () => {
  assert.deepEqual(parseMeasurement('duration', '1.5', 'min'), {ok: true, value: 90});
  assert.deepEqual(parseMeasurement('duration', '1:30.5'), {ok: true, value: 90.5});
  assert.deepEqual(parseMeasurement('duration', '1:02:03', 'h:mm:ss'), {ok: true, value: 3723});
  assert.equal(parseMeasurement('duration', '1:70').ok, false);
});

test('registered distance, height, and speed units convert to their canonical values', () => {
  assert.deepEqual(parseMeasurement('distance', '1.25', 'km'), {ok: true, value: 1250});
  assert.deepEqual(parseMeasurement('height', '10', 'in'), {ok: true, value: 25.4});
  assert.deepEqual(parseMeasurement('speed', '36', 'km/h'), {ok: true, value: 10});
  assert.equal(parseMeasurement('weight', '100', 'stone').ok, false);
});

test('pace input converts clock or decimal minutes to speed and rejects zero pace', () => {
  const clock = parseMeasurement('speed', '5:00', 'min/km');
  const decimal = parseMeasurement('speed', '5', 'min/km');
  assert.ok(clock.ok);
  assert.deepEqual(decimal, clock);
  assert.ok(Math.abs(Number(clock.value) - 3.3333333333333335) < 0.000001);
  assert.equal(parseMeasurement('speed', '0', 'min/km').ok, false);
});

test('assistance and negative settings survive while negative amounts are rejected', () => {
  assert.deepEqual(parseMeasurement('weight', '-12.5', 'kg'), {ok: true, value: -12.5});
  assert.deepEqual(parseMeasurement('incline', '-3'), {ok: true, value: -3});
  assert.deepEqual(parseMeasurement('score', '-2'), {ok: true, value: -2});
  assert.equal(parseMeasurement('distance', '-1').ok, false);
  assert.equal(parseMeasurement('duration', '-1').ok, false);
});

test('nonfinite and malformed input never becomes a measurement', () => {
  for (const input of ['NaN', 'Infinity', '-Infinity', 'one', '0x10', '1e2', '1.2.3']) {
    assert.equal(parseMeasurement('weight', input).ok, false, input);
  }
});

test('average cadence and heart rate retain fractions and outcomes stay typed', () => {
  assert.deepEqual(parseMeasurement('cadence', '85.5'), {ok: true, value: 85.5});
  assert.deepEqual(parseMeasurement('heart_rate', '140.5'), {ok: true, value: 140.5});
  assert.deepEqual(parseMeasurement('result', 'win'), {ok: true, value: 'win'});
  assert.equal(parseMeasurement('result', 'maybe').ok, false);
});

test('tempo has no measurement field and reserve belongs to detail', () => {
  assert.equal(measurementFields.tempo, null);
  assert.equal(parseMeasurement('tempo', '3-1-1-0').ok, false);
  assert.equal(measurementFields.reserve?.scope, 'detail');
  assert.equal(measurementFields.duration?.field, 'duration_s');
  assert.equal(measurementFields.cadence?.field, 'avg_cadence_per_min');
});
