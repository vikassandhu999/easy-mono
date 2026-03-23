import {Navigate, Route, Routes} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';
import Library from '@/library/library';

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);

// Protected screens
const RegisterBusinessScreen = withAuth(RegisterBusiness);
const AppShellScreen = withAuth(AppShell);

// Placeholder page for features not yet built
function Placeholder({title}: {title: string}) {
  return (
    <PageLayout title={title}>
      <p className="text-sm text-foreground-500">This page is under construction.</p>
    </PageLayout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        element={<LoginScreen />}
        path={ROUTES.LOGIN}
      />
      <Route
        element={<SignupScreen />}
        path={ROUTES.SIGNUP}
      />
      <Route
        element={<VerifyLoginOtp />}
        path={ROUTES.VERIFY_LOGIN_OTP}
      />
      <Route
        element={<VerifySignupOtp />}
        path={ROUTES.VERIFY_SIGNUP_OTP}
      />

      {/* Onboarding (protected, no shell) */}
      <Route
        element={<RegisterBusinessScreen />}
        path={ROUTES.REGISTER_BUSINESS}
      />

      {/* App (protected, with shell) */}
      <Route element={<AppShellScreen />}>
        <Route
          element={<Placeholder title="Dashboard" />}
          path={ROUTES.DASHBOARD}
        />
        <Route
          element={<Placeholder title="Clients" />}
          path={ROUTES.CLIENTS}
        />
        <Route
          element={<Placeholder title="Client Detail" />}
          path={ROUTES.CLIENT_DETAIL}
        />
        <Route
          element={<Library />}
          path={ROUTES.LIBRARY}
        />
        <Route
          element={<Placeholder title="Exercises" />}
          path={ROUTES.EXERCISES}
        />
        <Route
          element={<Placeholder title="Exercise Detail" />}
          path={ROUTES.EXERCISE_DETAIL}
        />
        <Route
          element={<Placeholder title="Foods" />}
          path={ROUTES.FOODS}
        />
        <Route
          element={<Placeholder title="Food Detail" />}
          path={ROUTES.FOOD_DETAIL}
        />
        <Route
          element={<Placeholder title="Recipes" />}
          path={ROUTES.RECIPES}
        />
        <Route
          element={<Placeholder title="Recipe Detail" />}
          path={ROUTES.RECIPE_DETAIL}
        />
        <Route
          element={<Placeholder title="Nutrition Plans" />}
          path={ROUTES.NUTRITION_PLANS}
        />
        <Route
          element={<Placeholder title="Nutrition Plan Detail" />}
          path={ROUTES.NUTRITION_PLAN_DETAIL}
        />
        <Route
          element={<Placeholder title="Training Plans" />}
          path={ROUTES.TRAINING_PLANS}
        />
        <Route
          element={<Placeholder title="Training Plan Detail" />}
          path={ROUTES.TRAINING_PLAN_DETAIL}
        />
        <Route
          element={<Placeholder title="Settings" />}
          path={ROUTES.SETTINGS}
        />
      </Route>

      {/* Catch-all */}
      <Route
        element={
          <Navigate
            replace
            to={ROUTES.DASHBOARD}
          />
        }
        path="*"
      />
    </Routes>
  );
}
