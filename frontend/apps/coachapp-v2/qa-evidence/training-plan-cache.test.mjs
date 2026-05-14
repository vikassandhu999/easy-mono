import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {transpileModule, ModuleKind, ScriptTarget} from 'typescript';

async function loadCacheHelpers() {
  const source = await readFile(new URL('../src/api/trainingPlanCache.ts', import.meta.url), 'utf8');
  const {outputText} = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.ES2022,
      target: ScriptTarget.ES2022,
    },
  });
  return import(`data:text/javascript,${encodeURIComponent(outputText)}`);
}

function createPlanDraft() {
  return {
    data: {
      id: 'plan-1',
      name: 'Plan',
      workouts: [
        {
          id: 'workout-1',
          name: 'Upper',
          workout_elements: [
            {
              id: 'element-1',
              workout_id: 'workout-1',
              exercise_id: 'exercise-1',
              exercise: {id: 'exercise-1', name: 'Bench Press'},
              position: 0,
              planned_sets: [],
            },
          ],
        },
      ],
      plan_items: [
        {
          id: 'item-1',
          training_plan_id: 'plan-1',
          workout_id: 'workout-1',
          day: 'monday',
          workout_type: 'primary',
        },
      ],
      rest_days: ['sunday'],
    },
  };
}

test('upserts workouts without replacing unrelated plan state', async () => {
  const {upsertWorkoutInPlan} = await loadCacheHelpers();
  const draft = createPlanDraft();

  upsertWorkoutInPlan(draft, {
    id: 'workout-2',
    name: 'Lower',
    workout_elements: [],
  });
  upsertWorkoutInPlan(draft, {
    id: 'workout-1',
    name: 'Upper renamed',
    workout_elements: [],
  });

  assert.deepEqual(
    draft.data.workouts.map((workout) => workout.name),
    ['Upper renamed', 'Lower'],
  );
  assert.deepEqual(draft.data.rest_days, ['sunday']);
  assert.equal(draft.data.plan_items.length, 1);
});

test('removes a workout and any schedule items that point at it', async () => {
  const {removeWorkoutFromPlan} = await loadCacheHelpers();
  const draft = createPlanDraft();

  removeWorkoutFromPlan(draft, 'workout-1');

  assert.deepEqual(draft.data.workouts, []);
  assert.deepEqual(draft.data.plan_items, []);
});

test('upserts and removes schedule items by id', async () => {
  const {removeTrainingPlanItemFromPlan, upsertTrainingPlanItemInPlan} = await loadCacheHelpers();
  const draft = createPlanDraft();

  upsertTrainingPlanItemInPlan(draft, {
    id: 'item-2',
    training_plan_id: 'plan-1',
    workout_id: 'workout-1',
    day: 'tuesday',
    workout_type: 'primary',
  });
  upsertTrainingPlanItemInPlan(draft, {
    id: 'item-1',
    training_plan_id: 'plan-1',
    workout_id: 'workout-1',
    day: 'wednesday',
    workout_type: 'primary',
  });
  removeTrainingPlanItemFromPlan(draft, 'item-2');

  assert.deepEqual(
    draft.data.plan_items.map((item) => `${item.id}:${item.day}`),
    ['item-1:wednesday'],
  );
});

test('upserts and removes workout elements inside their workout', async () => {
  const {removeWorkoutElementFromPlan, upsertWorkoutElementInPlan} = await loadCacheHelpers();
  const draft = createPlanDraft();

  upsertWorkoutElementInPlan(draft, {
    id: 'element-2',
    workout_id: 'workout-1',
    exercise_id: 'exercise-2',
    position: 1,
    planned_sets: [{target_reps: '10'}],
  });
  upsertWorkoutElementInPlan(draft, {
    id: 'element-1',
    workout_id: 'workout-1',
    exercise_id: 'exercise-1',
    position: 0,
    planned_sets: [{target_reps: '8'}],
  });
  removeWorkoutElementFromPlan(draft, {elementId: 'element-2', workoutId: 'workout-1'});

  assert.deepEqual(
    draft.data.workouts[0].workout_elements.map((element) => `${element.id}:${element.planned_sets[0]?.target_reps}`),
    ['element-1:8'],
  );
});

test('preserves existing exercise details when an element update omits them', async () => {
  const {upsertWorkoutElementInPlan} = await loadCacheHelpers();
  const draft = createPlanDraft();

  upsertWorkoutElementInPlan(draft, {
    id: 'element-1',
    workout_id: 'workout-1',
    exercise_id: 'exercise-1',
    position: 0,
    planned_sets: [{target_reps: '12'}],
  });

  assert.deepEqual(draft.data.workouts[0].workout_elements[0].exercise, {id: 'exercise-1', name: 'Bench Press'});
  assert.equal(draft.data.workouts[0].workout_elements[0].planned_sets[0].target_reps, '12');
});

test('replaces the aggregate plan when the server returns the full plan', async () => {
  const {replaceTrainingPlanInCache} = await loadCacheHelpers();
  const draft = createPlanDraft();

  replaceTrainingPlanInCache(draft, {
    ...draft.data,
    name: 'Updated Plan',
    rest_days: ['friday'],
    workouts: [],
    plan_items: [],
  });

  assert.equal(draft.data.name, 'Updated Plan');
  assert.deepEqual(draft.data.rest_days, ['friday']);
  assert.deepEqual(draft.data.workouts, []);
  assert.deepEqual(draft.data.plan_items, []);
});
