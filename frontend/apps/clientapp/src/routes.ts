export const routes = {
  home: '/',
  login: '/login',
  verify: '/verify',
  invitation: '/invite/:token',
  account: '/account',
  forms: '/forms',
  form: '/forms/:id',
} as const;
