import {useSyncExternalStore} from 'react';
import {createBrowserRouter, Link, matchPath, Navigate, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';
import {parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {AppShell} from './app-shell';
import {AuthLayout} from './auth/auth-layout';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Setup} from './auth/setup';
import {Signup} from './auth/signup';
import {Verify} from './auth/verify';
import {CheckInResponse} from './check-ins/check-in-response';
import {CheckInResponses, ClientCheckInResponses} from './check-ins/check-in-responses';
import {CheckInSchedules} from './check-ins/check-in-schedules';
import {CreateCheckIn} from './check-ins/create-check-in';
import {AssignNutritionPlan} from './clients/assign-nutrition-plan';
import {AssignTrainingPlan} from './clients/assign-training-plan';
import {ClientOverview} from './clients/client-overview';
import {Clients} from './clients/clients';
import {InviteClient} from './clients/invite-client';
import {ExerciseEditor} from './exercises/exercise-editor';
import {Exercises} from './exercises/exercises';
import {FoodEditor} from './foods/food-editor';
import {Foods} from './foods/foods';
import {FormEditor} from './forms/form-editor';
import {Forms} from './forms/forms';
import {NutritionHistory} from './nutrition-history/nutrition-history';
import {NutritionPlanEditor} from './nutrition-plans/nutrition-plan-editor';
import {NutritionPlans} from './nutrition-plans/nutrition-plans';
import {RecipeEditor} from './recipes/recipe-editor';
import {Recipes} from './recipes/recipes';
import {routes} from './routes';
import {TrainingPlanEditor} from './training-plans/training-plan-editor';
import {TrainingPlans} from './training-plans/training-plans';
import {TrainingSession} from './training-sessions/training-session';
import {TrainingSessions} from './training-sessions/training-sessions';
import {WeightProgress} from './weight-progress/weight-progress';

function Gate({guest = false}: {guest?: boolean}) {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  if (guest) {
    return session ? (
      <Navigate
        to={routes.home}
        replace
      />
    ) : (
      <Outlet />
    );
  }
  if (!session) {
    return (
      <Navigate
        to={routes.login}
        replace
      />
    );
  }
  if (session.tokens.scope !== 'coach' && location.pathname !== routes.setup) {
    return (
      <Navigate
        to={routes.setup}
        replace
      />
    );
  }
  if (session.tokens.scope === 'coach' && location.pathname === routes.setup) {
    return (
      <Navigate
        to={routes.home}
        replace
      />
    );
  }
  return <Outlet key={session.id} />;
}

function NotFound() {
  return (
    <AuthLayout
      title="Page not found"
      description="This address doesn't lead to a page."
    >
      <Link
        className="text-link"
        to={routes.home}
      >
        Return to your account
      </Link>
    </AuthLayout>
  );
}

function Root() {
  return (
    <>
      <Outlet />
      <ScrollRestoration
        getKey={(location) =>
          location.pathname === routes.forms ||
          location.pathname === routes.trainingPlans ||
          location.pathname === routes.exercises ||
          location.pathname === routes.nutritionPlans ||
          location.pathname === routes.foods ||
          location.pathname === routes.recipes ||
          location.pathname === routes.checkInResponses ||
          matchPath(routes.clientCheckInResponses, location.pathname) ||
          matchPath(routes.trainingSessions, location.pathname) ||
          matchPath(routes.weightProgress, location.pathname) ||
          matchPath(routes.assignNutritionPlan, location.pathname) ||
          matchPath(routes.clientCheckIns, location.pathname) ||
          location.pathname === routes.home ||
          matchPath(routes.assignTrainingPlan, location.pathname)
            ? location.pathname + location.search
            : location.key
        }
      />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Gate guest />,
        children: [
          {path: routes.login, element: <Login />},
          {path: routes.signup, element: <Signup />},
          {path: routes.verify, element: <Verify />},
        ],
      },
      {path: routes.invitation, element: <Invitation />},
      {
        element: <Gate />,
        children: [
          {
            element: <AppShell />,
            children: [
              {path: routes.home, element: <Clients />},
              {path: routes.inviteClient, element: <InviteClient />},
              {path: routes.client, element: <ClientOverview />},
              {path: routes.trainingSessions, element: <TrainingSessions />},
              {path: routes.trainingSession, element: <TrainingSession />},
              {path: routes.nutritionHistory, element: <NutritionHistory />},
              {path: routes.weightProgress, element: <WeightProgress />},
              {path: routes.clientCheckIns, element: <CheckInSchedules />},
              {path: routes.createCheckIn, element: <CreateCheckIn />},
              {path: routes.checkInResponses, element: <CheckInResponses />},
              {path: routes.checkInResponse, element: <CheckInResponse />},
              {path: routes.clientCheckInResponses, element: <ClientCheckInResponses />},
              {path: routes.clientCheckInResponse, element: <CheckInResponse />},
              {path: routes.assignTrainingPlan, element: <AssignTrainingPlan />},
              {path: routes.previewTrainingPlan, element: <AssignTrainingPlan />},
              {path: routes.trainingPlans, element: <TrainingPlans />},
              {path: routes.exercises, element: <Exercises />},
              {path: routes.createExercise, element: <ExerciseEditor />},
              {path: routes.exercise, element: <ExerciseEditor />},
              {path: routes.createTrainingPlan, element: <TrainingPlanEditor />},
              {path: routes.editTrainingPlan, element: <TrainingPlanEditor />},
              {path: routes.editClientTrainingPlan, element: <TrainingPlanEditor />},
              {path: routes.nutritionPlans, element: <NutritionPlans />},
              {path: routes.foods, element: <Foods />},
              {path: routes.recipes, element: <Recipes />},
              {path: routes.createRecipe, element: <RecipeEditor />},
              {path: routes.recipe, element: <RecipeEditor />},
              {path: routes.createFood, element: <FoodEditor />},
              {path: routes.food, element: <FoodEditor />},
              {path: routes.createNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.editNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.editClientNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.assignNutritionPlan, element: <AssignNutritionPlan />},
              {path: routes.previewNutritionPlan, element: <AssignNutritionPlan />},
              {path: routes.forms, element: <Forms />},
              {path: routes.createForm, element: <FormEditor key="new" />},
              {path: routes.editForm, element: <FormEditor />},
            ],
          },
          {path: routes.setup, element: <Setup />},
        ],
      },
      {path: '*', element: <NotFound />},
    ],
  },
]);
