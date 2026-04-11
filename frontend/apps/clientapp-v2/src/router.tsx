import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import AcceptInvite from '@/auth/accept-invite';
import Login from '@/auth/login';
import VerifyEmail from '@/auth/verify-email';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import Dashboard from '@/dashboard/dashboard';
import SessionDetail from '@/history/session-detail';
import WorkoutHistory from '@/history/workout-history';
import AddFood from '@/nutrition/add-food';
import NutritionDaily from '@/nutrition/nutrition-daily';
import TrainingPlanDetail from '@/training/training-plan-detail';
import ActiveWorkout from '@/workout/active-workout';

// ── Auth wrappers ────────────────────────────────────────────

const LoginScreen = withNotAuth(Login);
const AppShellScreen = withAuth(AppShell);

// ── Placeholder ──────────────────────────────────────────────

function Placeholder({title}: {title: string}) {
  return (
    <PageLayout title={title}>
      <p className="text-sm text-foreground-500">This page is under construction.</p>
    </PageLayout>
  );
}

// ── Router ───────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Public — invitation + auth
  {path: ROUTES.ACCEPT_INVITE, Component: AcceptInvite},
  {path: ROUTES.VERIFY_EMAIL, Component: VerifyEmail},
  {path: ROUTES.LOGIN, Component: LoginScreen},
  {path: ROUTES.VERIFY_LOGIN_OTP, Component: VerifyLoginOtp},

  // App (protected, with shell)
  {
    Component: AppShellScreen,
    children: [
      {path: ROUTES.DASHBOARD, Component: Dashboard},
      {path: ROUTES.NUTRITION, Component: NutritionDaily},
      {path: ROUTES.NUTRITION_ADD_FOOD, Component: AddFood},
      {path: ROUTES.TRAINING_PLAN, Component: TrainingPlanDetail},
      {path: ROUTES.WORKOUT_ACTIVE, Component: ActiveWorkout},
      {path: ROUTES.WORKOUT_HISTORY, Component: WorkoutHistory},
      {path: ROUTES.SESSION_DETAIL, Component: SessionDetail},
      {path: ROUTES.SETTINGS, element: <Placeholder title="Settings" />},
    ],
  },

  // Catch-all
  {
    path: '*',
    element: (
      <Navigate
        replace
        to={ROUTES.DASHBOARD}
      />
    ),
  },
]);
