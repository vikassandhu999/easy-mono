import {Toast} from '@heroui/react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router';

import GuestRoute from '@/components/GuestRoute';
import PrivateRoute from '@/components/PrivateRoute';
import AuthLayout from '@/pages/auth/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import VerifyPage from '@/pages/auth/VerifyPage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toast.Provider />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route
              element={<RegisterPage />}
              path="/register"
            />
            <Route
              element={<VerifyPage />}
              path="/register/verify"
            />
            <Route
              element={<LoginPage />}
              path="/login"
            />
            <Route
              element={<VerifyPage />}
              path="/login/verify"
            />
          </Route>
        </Route>

        <Route element={<PrivateRoute />}>
          <Route
            element={<OnboardingPage />}
            path="/onboarding"
          />
          <Route
            element={<span>Clients</span>}
            path="/clients"
          />
          <Route
            element={<span>Client View</span>}
            path="/clients/:id"
          />
          <Route
            element={<span>Library</span>}
            path="/library"
          />
          <Route
            element={<span>My Page</span>}
            path="/page"
          />
          <Route
            element={<span>Settings</span>}
            path="/settings"
          />
        </Route>

        <Route
          element={
            <Navigate
              replace
              to="/login"
            />
          }
          path="/"
        />
        <Route
          element={<span>Not Found</span>}
          path="*"
        />
      </Routes>
    </BrowserRouter>
  );
}
