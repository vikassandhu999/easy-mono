import {Navigate, Route, Routes} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import Login from '@/auth/login';
import Signup from '@/auth/signup';
import VerifyOtp from '@/auth/verify-otp';

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);
const VerifyOtpScreen = withNotAuth(VerifyOtp);

// Protected screens — placeholder until features are built
const DashboardScreen = withAuth(function Dashboard() {
  return <p className="p-4">Dashboard — you are logged in.</p>;
});

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
        element={<VerifyOtpScreen />}
        path={ROUTES.VERIFY_OTP}
      />

      {/* Protected */}
      <Route
        element={<DashboardScreen />}
        path={ROUTES.DASHBOARD}
      />

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
