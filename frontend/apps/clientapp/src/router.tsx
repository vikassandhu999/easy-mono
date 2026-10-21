import {createBrowserRouter, Navigate} from 'react-router-dom';
import {Account} from './account/account';
import {AccountDetails} from './account/details';
import {AppShell, Home} from './app-shell';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Verify} from './auth/verify';
import {CheckIns} from './check-ins/check-ins';
import {Messages} from './messages/messages';
import {routes} from './routes';
import {Meal} from './today/meal';
import {Workout} from './today/workout';
import {TodayPrototype} from './today-prototype/today-prototype';
import {TrackerHistory, Trackers} from './trackers/trackers';

export const router = createBrowserRouter([
  {path: routes.login, element: <Login />},
  {path: routes.verify, element: <Verify />},
  {path: routes.invitation, element: <Invitation />},
  // PROTOTYPE: no login, in-memory state.
  {path: routes.todayPrototype, element: <TodayPrototype />},
  {
    element: <AppShell />,
    children: [
      {path: routes.home, element: <Home />},
      {path: routes.meal, element: <Meal />},
      {path: routes.workout, element: <Workout />},
      {path: routes.checkIns, element: <CheckIns />},
      {path: routes.trackers, element: <Trackers />},
      {path: routes.tracker, element: <TrackerHistory />},
      {path: routes.account, element: <Account />},
      {path: routes.accountDetails, element: <AccountDetails />},
      {path: routes.messages, element: <Messages />},
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
