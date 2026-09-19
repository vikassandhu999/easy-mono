export const routes = {
  home: '/',
  login: '/login',
  verify: '/verify',
  invitation: '/invite/:token',
  account: '/account',
  forms: '/forms',
  form: '/forms/:id',
  training: '/training',
  trainingPlan: '/training/plans/:id',
  workout: '/training/plans/:id/workouts/:workoutId',
  trainingSession: '/training/sessions/:id',
} as const;
