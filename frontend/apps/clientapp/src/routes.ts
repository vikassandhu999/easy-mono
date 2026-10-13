export const routes = {
  home: '/',
  checkIns: '/check-ins',
  trackers: '/trackers',
  tracker: '/trackers/:id',
  login: '/login',
  verify: '/verify',
  invitation: '/invite/:token',
  account: '/account',
  accountDetails: '/account/details',
  messages: '/messages',
} as const;
