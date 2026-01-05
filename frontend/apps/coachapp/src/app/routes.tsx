import {createBrowserRouter, RouterProvider} from 'react-router';

import ClientsPage from '@/containers/ClientsPage';
import LoginPage from '@/domains/auth/pages/LoginPage';
import RegisterPage from '@/domains/auth/pages/RegisterPage';
import VerifyLoginPage from '@/domains/auth/pages/VerifyLoginPage';
import VerifyRegisterationPage from '@/domains/auth/pages/VerifyRegisterationPage';
import ClientListPage from '@/domains/client/pages/ClientListPage';
import ClientViewPage from '@/domains/client/pages/ClientViewPage';
import {NotFoundPage} from '@/domains/errors/pages/NotFoundPage';
import LibraryListPage from '@/domains/library/pages/LibraryListPage';
import MyPagePage from '@/domains/my_page/pages/FlowsListPage';
import SettingsPage from '@/domains/profile/pages/SettingsPage';
import {GuestGaurd, PrivateGaurd} from '@/shared/gaurds';
import ProtectedRouteLayout from '@/utils/ProtectedRouteLayout';

const router = createBrowserRouter([
  {
    path: '*',
    element: <NotFoundPage />,
  },
  {
    element: <GuestGaurd />,
    children: [
      {
        element: <RegisterPage />,
        path: '/register',
      },
      {
        element: <VerifyRegisterationPage />,
        path: '/register/verify',
      },
      {
        element: <LoginPage />,
        path: '/login',
      },
      {
        element: <VerifyLoginPage />,
        path: '/login/verify',
      },
    ],
  },
  {
    element: <PrivateGaurd />,
    children: [
      {
        element: <ProtectedRouteLayout />,
        children: [
          {
            element: <ClientListPage />,
            path: '/',
          },
          {
            element: <ClientsPage />,
            path: '/clients',
          },
          // {
          //     element: <ClientsPage />,
          //     path: '/clients1',
          // },
          {
            element: <ClientViewPage />,
            path: '/clients/:id',
          },
          {
            element: <LibraryListPage />,
            path: '/library',
          },
          {
            element: <MyPagePage />,
            path: '/page',
          },
          {
            element: <SettingsPage />,
            path: '/settings',
          },
        ],
      },
    ],
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
