import assert from 'node:assert/strict';
import type {Workout as ApiWorkout, Exercise} from '../../src/api/exercises.ts';
import type {NutritionLog as ApiNutritionLog} from '../../src/api/nutrition-logs.ts';
import {
  actions,
  asNutritionLog,
  asWorkout,
  asWorkoutLog,
  mealSeed,
  metricValue,
  parseAmount,
  parseMealDraft,
  parseWorkoutDraft,
  pendingSetCorrections,
  rowKey,
  setInput,
  targetText,
  targetValue,
  totalOf,
  valuesLine,
  weekOf,
  workoutInput,
} from '../../src/today/model.ts';

assert.equal(parseAmount('1,5'), 1.5);
assert.equal(parseAmount(' 1.5 '), 1.5);
for (const input of ['', '0', '-1', '1e2', '0x10', '1,2,3', 'Infinity', '1/2']) {
  assert.equal(parseAmount(input), null, `Reject ${input}`);
}
const recorded: ApiNutritionLog = {
  id: 'occasion',
  type: 'meal',
  logged_on: '2026-10-12',
  logged_at: '08:20',
  recorded_by: 'client',
  nutrition_schedule_id: 'breakfast',
  scheduled_date: '2026-10-12',
  nutrition_preset_id: 'preset',
  meal_option_id: 'option',
  food_logs: [
    {
      id: 'food-row',
      meal_item_id: 'planned',
      food_id: 'oats',
      name: 'Rolled oats at save',
      kind: 'food',
      basis: '100g',
      unit_label: null,
      servings: [{label: 'cup', amount: 80}],
      amount: 1,
      unit: 'cup',
      nutrients: {energy_kcal: 400, protein_g: 10, carbs_g: 60, fat_g: 5},
    },
  ],
};
const reopened = asNutritionLog(recorded);
const draft = mealSeed('2026-10-12', 'breakfast', null, null, reopened, '2026-10-13');
assert.equal(draft.items[0]?.input, '1');
assert.equal(draft.items[0]?.food.name, 'Rolled oats at save');
assert.equal(draft.optionId, 'option');
const original = draft.items[0];
assert.ok(original);
const correction = {...original, input: '1,5', amount: parseAmount('1,5') ?? 0};
assert.deepEqual(
  totalOf([correction]),
  {values: {energy_kcal: 480, protein_g: 12, carbs_g: 72, fat_g: 6}, incomplete: false, empty: false},
  'Corrections calculate from copied serving and nutrients',
);
const unknown = {...correction, food: {...correction.food, nutrients: {}}};
assert.equal(valuesLine(totalOf([unknown])), 'Nutrients not listed');
assert.equal(valuesLine(totalOf([correction, unknown])), '480 kcal · P 12 · C 72 · F 6 · incomplete');
assert.equal(totalOf([]).empty, true, 'No records remains distinct from known zero intake');
const savedDraft = parseMealDraft(JSON.parse(JSON.stringify({...draft, items: [correction], changed: true})));
assert.equal(savedDraft?.items[0]?.input, '1,5', 'Device recovery retains decimal text');
assert.equal(savedDraft?.changed, true);
assert.equal(
  parseMealDraft({...draft, items: [{...correction, input: 1.5}]}),
  null,
  'A corrupted input never opens as a valid draft',
);
assert.deepEqual(weekOf('2026-10-13'), [
  '2026-10-12',
  '2026-10-13',
  '2026-10-14',
  '2026-10-15',
  '2026-10-16',
  '2026-10-17',
  '2026-10-18',
]);
const squat: Exercise = {
  id: 'squat',
  name: 'Back squat',
  kind: 'movement',
  goals: ['strength'],
  places: ['gym'],
  metrics: ['reps', 'weight'],
  count_label: null,
  grade_scale: [],
  unilateral: false,
  equipment: [],
  muscles: [],
  media: null,
  is_builtin: true,
};
const workout: ApiWorkout = {
  id: 'workout',
  client_id: 'client',
  name: 'Lower A',
  description: 'Warm up',
  type: 'prescribed',
  video: null,
  groups: [
    {
      id: 'A',
      name: null,
      rounds: 2,
      exercises: [
        {
          id: 'squat-prescription',
          exercise_id: squat.id,
          exercise: squat,
          targets_mode: 'per_round',
          targets: [
            {reps: {mode: 'exact', value: 5}, weight: {mode: 'exact', value: 100}},
            {reps: {mode: 'max'}, weight: {mode: 'range', min: 80, max: 90}},
          ],
          rest: [{mode: 'exact', value: 180}],
        },
      ],
    },
  ],
};
const normalized = asWorkout(workout);
const prescribed = normalized.groups[0]?.exercises[0];
assert.ok(prescribed);
assert.equal(targetText(prescribed.targets[1] ?? {}, 'weight'), '80–90 kg');
assert.equal(targetValue(prescribed.targets[1] ?? {}, 'weight'), '80');
assert.equal(targetValue(prescribed.targets[1] ?? {}, 'reps'), '', 'Max has no invented repetition count');
assert.equal(metricValue('-20,5', 'weight', squat), -20.5, 'Assistance is a real negative weight');
assert.equal(metricValue('0', 'reps', squat), 0);
assert.equal(metricValue('5.5', 'reps', squat), null);
assert.equal(metricValue('11', 'effort', squat), null);
assert.equal(metricValue('0', 'effort', squat), null);
assert.equal(metricValue('0', 'reserve', squat), 0);
assert.equal(metricValue('1e2', 'weight', squat), null);
const done = {...squat, id: 'split-squat', name: 'Bulgarian split squat', unilateral: true};
const left = actions.newSet(prescribed, done, 1, 'L', {reps: 10, weight: 16});
assert.deepEqual(
  setInput(left),
  {
    workout_exercise_id: 'squat-prescription',
    exercise_id: 'split-squat',
    round: 1,
    side: 'left',
    entered_units: {reps: 'reps', weight: 'kg'},
    reps: 10,
    weight_kg: 16,
  },
  'A replacement keeps its prescription link and its own performed exercise',
);
assert.notEqual(rowKey(prescribed.id, 1, 'L'), rowKey(prescribed.id, 1, 'R'));
const localWorkout = {
  inputs: {[rowKey(prescribed.id, 1, 'R')]: {weight: '16,5', reps: '10'}},
  extraRounds: {[prescribed.id]: 1},
};
assert.deepEqual(parseWorkoutDraft(JSON.parse(JSON.stringify(localWorkout))), localWorkout);
assert.equal(parseWorkoutDraft({...localWorkout, extraRounds: {[prescribed.id]: -1}}), null);
assert.equal(parseWorkoutDraft({inputs: [], extraRounds: {}}), null);
assert.equal(parseWorkoutDraft({...localWorkout, inputs: {row: {reps: 10}}}), null);

assert.equal(
  setInput({...left, persisted: true, id: 'server-set'}).id,
  'server-set',
  'Only acknowledged set IDs are sent back',
);

assert.equal(
  asWorkout({
    ...workout,
    groups: [
      {
        ...workout.groups[0],
        id: 'group',
        name: null,
        rounds: 2,
        exercises: [
          {
            ...workout.groups[0]?.exercises[0],
            id: 'exercise',
            exercise_id: squat.id,
            exercise: squat,
            targets_mode: 'same_for_all',
            targets: [{}],
            rest: [{mode: 'range', min: 90, max: 120}],
          },
        ],
      },
    ],
  }).groups[0]?.exercises[0]?.rest,
  'Rest 1:30–2:00',
);

const swappedLog = {
  id: 'log',
  date: '2026-10-13',
  time: '07:00',
  at_utc: null,
  text: null,
  recorded_by: 'client',
  state: 'active' as const,
  difficulty: null,
  pain: null,
  pain_note: null,
  workout_id: workout.id,
  schedule_id: 'schedule',
  scheduled_date: '2026-10-13',
  sets: [],
  swaps: {'squat-prescription': 'side-plank'},
  swap_exercises: {'squat-prescription': {...squat, id: 'side-plank', name: 'Side plank', metrics: ['duration']}},
};
assert.deepEqual(
  asWorkoutLog(swappedLog).swaps['squat-prescription']?.metrics,
  ['duration'],
  'The acknowledged swap snapshot is keyed by prescribed workout exercise ID',
);

const untickedTarget = {reps: {mode: 'exact' as const, value: 5}, weight: {mode: 'exact' as const, value: 100}};
assert.equal(
  workoutInput({inputs: {}, sets: []}, prescribed.id, 1, null, untickedTarget, 'reps'),
  '5',
  'Unticked sets start from the target',
);
const clearedSet = {...left, side: null, values: {weight: 100}, persisted: true};
assert.equal(
  workoutInput({inputs: {}, sets: [clearedSet]}, prescribed.id, 1, null, untickedTarget, 'reps'),
  '',
  'A cleared recorded metric remains blank after drafts are removed',
);
assert.equal(workoutInput({inputs: {}, sets: [clearedSet]}, prescribed.id, 1, null, untickedTarget, 'weight'), '100');
assert.equal(
  workoutInput(
    {inputs: {[rowKey(prescribed.id, 1, null)]: {reps: ''}}, sets: []},
    prescribed.id,
    1,
    null,
    untickedTarget,
    'reps',
  ),
  '',
  'An unsaved clear overrides a target',
);

assert.deepEqual(
  setInput({...left, values: {duration: 45, distance: 1000, power: 200, effort: 8, result: 'win', grade: 'V4'}})
    .entered_units,
  {duration: 's', distance: 'm', power: 'W', effort: 'RPE'},
  'Payload states the displayed base units and excludes non-numeric outcome metrics',
);

const canonicalSet = {
  ...left,
  performedId: squat.id,
  name: squat.name,
  side: null,
  persisted: true,
  values: {reps: 5, weight: 100},
};
const returnedDraft = {
  state: 'active' as const,
  sets: [canonicalSet],
  swaps: {},
  inputs: {[rowKey(prescribed.id, 1, null)]: {weight: '101'}},
};
const pendingCorrection = pendingSetCorrections(returnedDraft, normalized);
assert.equal(pendingCorrection.pending, true, 'Restored recorded-set input differs from the saved fact');
assert.equal(workoutInput(returnedDraft, prescribed.id, 1, null, untickedTarget, 'weight'), '101');
assert.deepEqual(
  setInput(pendingCorrection.sets[0] ?? canonicalSet),
  {
    id: canonicalSet.id,
    workout_exercise_id: prescribed.id,
    exercise_id: squat.id,
    round: 1,
    side: null,
    entered_units: {reps: 'reps', weight: 'kg'},
    reps: 5,
    weight_kg: 101,
  },
  'Retry submits the displayed correction with the owned saved-set ID',
);
assert.equal(
  pendingSetCorrections({...returnedDraft, sets: [{...canonicalSet, values: {reps: 5, weight: 101}}]}, normalized)
    .pending,
  false,
  'Acknowledged corrections need no further Retry',
);
assert.equal(
  pendingSetCorrections({...returnedDraft, inputs: {[rowKey(prescribed.id, 1, null)]: {weight: '100'}}}, normalized)
    .pending,
  false,
  'Restoring the saved value removes the pending correction',
);
assert.equal(
  pendingSetCorrections({...returnedDraft, state: 'completed'}, normalized).pending,
  false,
  'Completed records do not apply active device inputs',
);
assert.deepEqual(
  pendingSetCorrections({...returnedDraft, inputs: {[rowKey(prescribed.id, 1, null)]: {reps: ''}}}, normalized).sets[0]
    ?.values,
  {weight: 100},
  'An unsaved clear remains a correction rather than a target value',
);
