import {createBrowserRouter, RouterProvider} from 'react-router';

import AcceptInvitationPage from '@/domains/auth/pages/AcceptInvitationPage';
import PublicJoinPage from '@/domains/auth/pages/PublicJoinPage';
import SignInCodePage from '@/domains/auth/pages/SignInCodePage';
import SignInPage from '@/domains/auth/pages/SignInPage';
import HomePage from '@/domains/home/pages/HomePage';
import SchedulePage from '@/domains/schedule/pages/SchedulePage';
import MainProfilePage from '@/domains/settings/pages/MainProfilePage';
import SettingsPage from '@/domains/settings/pages/SettingsPage';
import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';

const router = createBrowserRouter([
  // Public auth routes
  {
    element: <SignInPage />,
    path: '/signin',
  },
  {
    element: <SignInCodePage />,
    path: '/signin/code',
  },
  {
    element: <PublicJoinPage />,
    path: '/join/:code',
  },
  {
    element: <AcceptInvitationPage />,
    path: '/invite/:token',
  },
  // Protected routes
  {
    element: <ProtectedRouteLayout />,
    children: [
      {
        element: <HomePage />,
        path: '/',
      },
      {
        element: <SchedulePage />,
        path: '/schedule',
      },
      {
        element: <SettingsPage />,
        path: '/settings',
      },
      {
        element: <MainProfilePage />,
        path: '/settings/profile',
      },
    ],
  },
]);

const AppRouterProvider = () => {
  return <RouterProvider router={router} />;
};

export default AppRouterProvider;
