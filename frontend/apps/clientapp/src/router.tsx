import {createBrowserRouter, Navigate} from 'react-router-dom';
import {Account} from './account/account';
import {AppShell, Home} from './app-shell';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Verify} from './auth/verify';
import {routes} from './routes';

export const router = createBrowserRouter([
  {path: routes.login, element: <Login />},
  {path: routes.verify, element: <Verify />},
  {path: routes.invitation, element: <Invitation />},
  {
    element: <AppShell />,
    children: [
      {path: routes.home, element: <Home />},
      {path: routes.account, element: <Account />},
    ],
  },
  {
    path: '*',
    element: (
      <Navigate
        to={routes.home}
        replace
      />
    ),
  },
]);
