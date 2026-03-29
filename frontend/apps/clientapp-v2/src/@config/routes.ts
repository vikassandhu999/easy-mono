export const ROUTES = {
  LOGIN: '/login',
  VERIFY_LOGIN_OTP: '/verify-login',
  ACCEPT_INVITE: '/invite/:token',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  WORKOUT_ACTIVE: '/workout',
  WORKOUT_HISTORY: '/history',
  SESSION_DETAIL: '/history/:sessionId',
  SETTINGS: '/settings',
} as const;
