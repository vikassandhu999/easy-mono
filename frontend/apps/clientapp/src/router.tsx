import {createBrowserRouter, Navigate} from 'react-router-dom';
import {Account} from './account/account';
import {AccountDetails} from './account/details';
import {WeightGoal} from './account/goal';
import {AppShell, Home} from './app-shell';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Verify} from './auth/verify';
import {FormDetail} from './forms/form';
import {Forms} from './forms/forms';
import {Messages} from './messages/messages';
import {NutritionMeal} from './nutrition/meal';
import {CurrentNutritionPlan, Nutrition, NutritionPlan} from './nutrition/nutrition';
import {Progress} from './progress/progress';
import {Weight} from './progress/weight';
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
      {path: routes.accountDetails, element: <AccountDetails />},
      {path: routes.accountGoal, element: <WeightGoal />},
      {path: routes.progress, element: <Progress />},
      {path: routes.weight, element: <Weight />},
      {path: routes.messages, element: <Messages />},
      {path: routes.forms, element: <Forms />},
      {path: routes.form, element: <FormDetail />},
      {path: routes.training, element: <Training />},
      {path: routes.trainingPlan, element: <TrainingPlan />},
      {path: routes.workout, element: <TrainingPlan />},
      {path: routes.trainingSession, element: <TrainingSession />},
      {path: routes.nutrition, element: <Nutrition />},
      {path: routes.nutritionPlans, element: <CurrentNutritionPlan />},
      {path: routes.nutritionPlan, element: <NutritionPlan />},
      {path: routes.nutritionMeal, element: <NutritionMeal />},
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
