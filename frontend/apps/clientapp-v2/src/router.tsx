import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import AcceptInvite from '@/auth/accept-invite';
import Login from '@/auth/login';
import VerifyInviteOtp from '@/auth/verify-invite-otp';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import FillCheckin from '@/checkins/fill-checkin';
import ListCheckins from '@/checkins/list-checkins';
import SessionDetail from '@/history/session-detail';
import WorkoutHistory from '@/history/workout-history';
import NutritionHistory from '@/nutrition/nutrition-history';
import NutritionToday from '@/nutrition/nutrition-today';
import ProgressHome from '@/progress/progress-home';
import Settings from '@/settings/settings';
import TrainingHome from '@/training/training-home';
import ActiveWorkout from '@/workout/active-workout';

// ── Auth wrappers ────────────────────────────────────────────

const LoginScreen = withNotAuth(Login);
const AppShellScreen = withAuth(AppShell);

// ── Router ───────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Public — invitation + auth
  {path: ROUTES.ACCEPT_INVITE, Component: AcceptInvite},
  {path: ROUTES.VERIFY_INVITE_OTP, Component: VerifyInviteOtp},
  {path: ROUTES.LOGIN, Component: LoginScreen},
  {path: ROUTES.VERIFY_LOGIN_OTP, Component: VerifyLoginOtp},

  // App (protected, with shell)
  {
    Component: AppShellScreen,
    children: [
      {path: ROUTES.TRAINING, Component: TrainingHome},
      {path: ROUTES.NUTRITION, Component: NutritionToday},
      {path: ROUTES.NUTRITION_HISTORY, Component: NutritionHistory},
      {path: ROUTES.PROGRESS, Component: ProgressHome},
      {path: ROUTES.CHECKINS, Component: ListCheckins},
      {path: ROUTES.CHECKIN_FILL, Component: FillCheckin},
      {path: ROUTES.WORKOUT_ACTIVE, Component: ActiveWorkout},
      {path: ROUTES.WORKOUT_HISTORY, Component: WorkoutHistory},
      {path: ROUTES.SESSION_DETAIL, Component: SessionDetail},
      {path: ROUTES.SETTINGS, Component: Settings},
    ],
  },

  // Catch-all
  {
    path: '*',
    element: (
      <Navigate
        replace
        to={ROUTES.TRAINING}
      />
    ),
  },
]);
