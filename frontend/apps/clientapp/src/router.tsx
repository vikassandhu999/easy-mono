import {createBrowserRouter, Navigate} from 'react-router-dom';
import {Account} from './account/account';
import {AppShell, Home} from './app-shell';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Verify} from './auth/verify';
import {FormDetail} from './forms/form';
import {Forms} from './forms/forms';
import {routes} from './routes';
import {TrainingSession} from './training/session';
import {Training, TrainingPlan} from './training/training';

export const router = createBrowserRouter([
  {path: routes.login, element: <Login />},
  {path: routes.verify, element: <Verify />},
  {path: routes.invitation, element: <Invitation />},
  {
    element: <AppShell />,
    children: [
      {path: routes.home, element: <Home />},
      {path: routes.account, element: <Account />},
      {path: routes.forms, element: <Forms />},
      {path: routes.form, element: <FormDetail />},
      {path: routes.training, element: <Training />},
      {path: routes.trainingPlan, element: <TrainingPlan />},
      {path: routes.workout, element: <TrainingPlan />},
      {path: routes.trainingSession, element: <TrainingSession />},
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
