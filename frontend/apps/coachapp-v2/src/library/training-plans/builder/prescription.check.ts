import {planToPrescriptionRequestForWeekdays} from '../../../api/training-sessions.ts';

const plan = {
  revision: 4,
  workouts: [
    {
      id: 'persisted-workout',
      name: 'Upper',
      position: 30,
      workout_elements: [
        {
          id: 'persisted-exercise-press',
          exercise_id: 'press-id',
          position: 9,
          planned_sets: [],
        },
      ],
    },
    {
      id: 'local:workout-new',
      name: 'Lower',
      position: 10,
      workout_elements: [
        {
          id: 'local:exercise-squat',
          exercise_id: 'squat-id',
          position: 40,
          planned_sets: [],
        },
        {
          id: 'persisted-exercise-lunge',
          exercise_id: 'lunge-id',
          position: 20,
          planned_sets: [],
        },
      ],
    },
  ],
  schedule: {
    monday: 'persisted-workout',
    tuesday: null,
    wednesday: 'local:workout-new',
    thursday: null,
    friday: 'local:workout-new',
    saturday: null,
    sunday: null,
  },
} as unknown as Parameters<typeof planToPrescriptionRequestForWeekdays>[0];

const request = planToPrescriptionRequestForWeekdays(plan, [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

if (request.expected_revision !== 4) {
  throw new Error('Prescription replacement must send the observed plan revision');
}
if (request.workouts[0]?.id !== 'persisted-workout' || request.workouts[0]?.position !== 30) {
  throw new Error('persisted workouts must retain server identity and explicit sparse position');
}
if (request.workouts[1]?.local_ref !== 'workout-new' || request.workouts[1]?.position !== 10) {
  throw new Error('new workouts must use request-local identity and explicit sparse position');
}
if (request.workouts[0]?.prescribed_exercises[0]?.position !== 9) {
  throw new Error('persisted Prescribed Exercises must retain explicit sparse position');
}
if (
  request.workouts[1]?.prescribed_exercises[0]?.local_ref !== 'exercise-squat' ||
  request.workouts[1]?.prescribed_exercises[0]?.position !== 40
) {
  throw new Error('new Prescribed Exercises must use request-local identity and explicit sparse position');
}
if (
  request.workouts[1]?.prescribed_exercises[1]?.id !== 'persisted-exercise-lunge' ||
  request.workouts[1]?.prescribed_exercises[1]?.position !== 20
) {
  throw new Error('Prescribed Exercise array order must not overwrite explicit sparse positions');
}
if (request.schedule[0]?.workout_id !== 'persisted-workout') {
  throw new Error('schedule must reference persisted workout ids');
}
if (request.schedule[2]?.workout_ref !== 'workout-new' || request.schedule[4]?.workout_ref !== 'workout-new') {
  throw new Error('schedule must resolve the same new workout on several weekdays');
}
if (request.schedule.length !== 7 || request.schedule[1]?.weekday !== 'tuesday') {
  throw new Error('Prescription replacement must send the complete ordered weekday interface');
}

const emptyWorkoutPlan = {
  revision: 1,
  workouts: [
    {
      id: 'local:workout-empty',
      name: 'New workout',
      position: 0,
      workout_elements: [],
    },
  ],
  schedule: {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  },
} as unknown as Parameters<typeof planToPrescriptionRequestForWeekdays>[0];
const emptyWorkoutRequest = planToPrescriptionRequestForWeekdays(emptyWorkoutPlan, ['monday']);
if (
  emptyWorkoutRequest.workouts[0]?.local_ref !== 'workout-empty' ||
  emptyWorkoutRequest.workouts[0]?.prescribed_exercises.length !== 0
) {
  throw new Error('Adding an empty workout must produce a valid pre-fetch Prescription request');
}

console.log('training-prescription: all checks passed');
