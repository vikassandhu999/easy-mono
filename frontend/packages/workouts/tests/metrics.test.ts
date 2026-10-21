import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaultMetrics, metricCatalogue, metricLabel} from '../src/metrics.ts';

test('metricLabel uses the catalogue for a null label and the custom label otherwise', () => {
  assert.equal(metricLabel('reps', {label: null}), 'Reps');
  assert.equal(metricLabel('reps', {label: 'Moves completed'}), 'Moves completed');
  assert.equal(metricLabel('weight'), 'Weight');
});

test('historical grade retains its label without becoming selectable', () => {
  assert.equal(metricLabel('grade'), 'Grade');
  assert.equal('grade' in metricCatalogue, false);
  assert.equal(metricLabel('tempo'), 'Tempo');
});

test('kind defaults refer only to selectable catalogue metrics', () => {
  for (const defaults of Object.values(defaultMetrics)) {
    for (const key of defaults) {
      assert.ok(key in metricCatalogue);
      assert.equal(metricLabel(key), metricCatalogue[key].label);
    }
  }
});
