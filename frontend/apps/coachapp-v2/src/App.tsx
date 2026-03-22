import {Navigate, Route, Routes} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';

// Placeholder screens — replace with real feature screens as they are built
function Placeholder({title}: {title: string}) {
  return <p>{title}</p>;
}

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(function Login() {
  return <Placeholder title="Login" />;
});

const SignupScreen = withNotAuth(function Signup() {
  return <Placeholder title="Signup" />;
});

// Protected screens
const DashboardScreen = withAuth(function Dashboard() {
  return <Placeholder title="Dashboard" />;
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
