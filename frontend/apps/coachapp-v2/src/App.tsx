import {Navigate, Route, Routes} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);

// Semi-public: needs a token (from OTP) but not full auth redirect
// VerifyOtp handles its own guard (redirects to /login if no email in state)
// RegisterBusiness requires a guest token from signup OTP flow

// Protected screens
const RegisterBusinessScreen = withAuth(RegisterBusiness);
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
        element={<VerifyLoginOtp />}
        path={ROUTES.VERIFY_LOGIN_OTP}
      />
      <Route
        element={<VerifySignupOtp />}
        path={ROUTES.VERIFY_SIGNUP_OTP}
      />

      {/* Protected */}
      <Route
        element={<RegisterBusinessScreen />}
        path={ROUTES.REGISTER_BUSINESS}
      />
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
