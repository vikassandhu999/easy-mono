import {Navigate, Route, Routes} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import AcceptInvite from '@/auth/accept-invite';
import Login from '@/auth/login';
import VerifyEmail from '@/auth/verify-email';
import VerifyLoginOtp from '@/auth/verify-login-otp';

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(Login);

// Protected screens
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
      {/* Public — invitation + auth */}
      <Route
        element={<AcceptInvite />}
        path={ROUTES.ACCEPT_INVITE}
      />
      <Route
        element={<VerifyEmail />}
        path={ROUTES.VERIFY_EMAIL}
      />
      <Route
        element={<LoginScreen />}
        path={ROUTES.LOGIN}
      />
      <Route
        element={<VerifyLoginOtp />}
        path={ROUTES.VERIFY_LOGIN_OTP}
      />

      {/* App (protected, with shell) */}
      <Route element={<AppShellScreen />}>
        <Route
          element={<Placeholder title="Dashboard" />}
          path={ROUTES.DASHBOARD}
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
