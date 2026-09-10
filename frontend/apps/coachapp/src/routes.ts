export const routes = {
  home: '/',
  inviteClient: '/clients/invite',
  client: '/clients/:id',
  forms: '/forms',
  createForm: '/forms/new',
  editForm: '/forms/:id',
  login: '/login',
  signup: '/signup',
  verify: '/verify',
  setup: '/register-business',
  invitation: '/accept-invite',
} as const;
