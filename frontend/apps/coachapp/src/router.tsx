import {useSyncExternalStore} from 'react';
import {createBrowserRouter, Link, matchPath, Navigate, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';
import {ApplicationPage} from './acquisition/application';
import {Applications} from './acquisition/applications';
import {CoachingPage} from './acquisition/coaching-page';
import {CoachingPageEditor} from './acquisition/coaching-page-editor';
import {EnrollApplication} from './acquisition/enroll-application';
import {PublicCoachingPage} from './acquisition/public-coaching-page';
import {parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {AppShell} from './app-shell';
import {AuthLayout} from './auth/auth-layout';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {Setup} from './auth/setup';
import {Signup} from './auth/signup';
import {Verify} from './auth/verify';
import {BillingPage} from './billing/billing';
import {CheckInResponse} from './check-ins/check-in-response';
import {CheckInResponses, ClientCheckInResponses} from './check-ins/check-in-responses';
import {CheckInSchedules} from './check-ins/check-in-schedules';
import {CreateCheckIn} from './check-ins/create-check-in';
import {AssignNutritionPlan} from './clients/assign-nutrition-plan';
import {AssignTrainingPlan} from './clients/assign-training-plan';
import {ChangeClientCoach} from './clients/change-client-coach';
import {ClientOverview} from './clients/client-overview';
import {ClientProfile} from './clients/client-profile';
import {Clients} from './clients/clients';
import {InviteClient} from './clients/invite-client';
import {Conversation} from './conversations/conversation';
import {Conversations} from './conversations/conversations';
import {ExerciseEditor} from './exercises/exercise-editor';
import {Exercises} from './exercises/exercises';
import {FoodEditor} from './foods/food-editor';
import {Foods} from './foods/foods';
import {FormEditor} from './forms/form-editor';
import {Forms} from './forms/forms';
import {ManageForm} from './forms/manage-form';
import {NutritionHistory} from './nutrition-history/nutrition-history';
import {LibraryManagement} from './nutrition-library/library-management';
import {NutritionPlanEditor} from './nutrition-plans/nutrition-plan-editor';
import {NutritionPlans} from './nutrition-plans/nutrition-plans';
import {ClientPlanManagement} from './plan-management/client-plan-management';
import {ClientPlans} from './plan-management/client-plans';
import {PlanManagement} from './plan-management/plan-management';
import {RecipeEditor} from './recipes/recipe-editor';
import {Recipes} from './recipes/recipes';
import {routes} from './routes';
import {BusinessSettings, ProfileSettings} from './settings/settings';
import {InviteCoach} from './team/invite-coach';
import {Team} from './team/team';
import {TeamMemberPage} from './team/team-member';
import {TrainingPlanEditor} from './training-plans/training-plan-editor';
import {TrainingPlans} from './training-plans/training-plans';
import {TrainingSession} from './training-sessions/training-session';
import {TrainingSessions} from './training-sessions/training-sessions';
import {WeightProgress} from './weight-progress/weight-progress';
import {Workbench} from './workbench/workbench';

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
          location.pathname === routes.workbench ||
          location.pathname === routes.team ||
          location.pathname === routes.applications ||
          location.pathname === routes.forms ||
          location.pathname === routes.conversations ||
          location.pathname === routes.trainingPlans ||
          location.pathname === routes.exercises ||
          location.pathname === routes.nutritionPlans ||
          location.pathname === routes.foods ||
          location.pathname === routes.recipes ||
          matchPath(routes.manageTrainingPlan, location.pathname) ||
          matchPath(routes.manageNutritionPlan, location.pathname) ||
          matchPath(routes.clientTrainingPlans, location.pathname) ||
          matchPath(routes.manageClientTrainingPlan, location.pathname) ||
          matchPath(routes.clientNutritionPlans, location.pathname) ||
          matchPath(routes.manageClientNutritionPlan, location.pathname) ||
          matchPath(routes.manageFood, location.pathname) ||
          matchPath(routes.manageRecipe, location.pathname) ||
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
      {path: routes.publicCoachingPage, element: <PublicCoachingPage />},
      {
        element: <Gate />,
        children: [
          {
            element: <AppShell />,
            children: [
              {path: routes.home, element: <Clients />},
              {path: routes.workbench, element: <Workbench />},
              {path: routes.team, element: <Team />},
              {path: routes.billing, element: <BillingPage />},
              {path: routes.coachingPage, element: <CoachingPage />},
              {path: routes.applications, element: <Applications />},
              {path: routes.application, element: <ApplicationPage />},
              {path: routes.enrollApplication, element: <EnrollApplication />},
              {path: routes.editCoachingPage, element: <CoachingPageEditor />},
              {path: routes.inviteCoach, element: <InviteCoach />},
              {path: routes.teamMember, element: <TeamMemberPage />},
              {path: routes.changeClientCoach, element: <ChangeClientCoach />},
              {path: routes.profileSettings, element: <ProfileSettings />},
              {path: routes.businessSettings, element: <BusinessSettings />},
              {path: routes.inviteClient, element: <InviteClient />},
              {path: routes.client, element: <ClientOverview />},
              {path: routes.clientProfile, element: <ClientProfile />},
              {path: routes.conversations, element: <Conversations />},
              {path: routes.clientConversation, element: <Conversation />},
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
              {path: routes.clientTrainingPlans, element: <ClientPlans resource="training" />},
              {path: routes.manageClientTrainingPlan, element: <ClientPlanManagement resource="training" />},
              {path: routes.manageTrainingPlan, element: <PlanManagement resource="training" />},
              {path: routes.editTrainingPlan, element: <TrainingPlanEditor />},
              {path: routes.editClientTrainingPlan, element: <TrainingPlanEditor />},
              {path: routes.nutritionPlans, element: <NutritionPlans />},
              {path: routes.foods, element: <Foods />},
              {path: routes.recipes, element: <Recipes />},
              {path: routes.createRecipe, element: <RecipeEditor />},
              {path: routes.recipe, element: <RecipeEditor />},
              {path: routes.createFood, element: <FoodEditor />},
              {path: routes.food, element: <FoodEditor />},
              {path: routes.manageFood, element: <LibraryManagement resource="food" />},
              {path: routes.manageRecipe, element: <LibraryManagement resource="recipe" />},
              {path: routes.createNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.clientNutritionPlans, element: <ClientPlans resource="nutrition" />},
              {path: routes.manageClientNutritionPlan, element: <ClientPlanManagement resource="nutrition" />},
              {path: routes.manageNutritionPlan, element: <PlanManagement resource="nutrition" />},
              {path: routes.editNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.editClientNutritionPlan, element: <NutritionPlanEditor />},
              {path: routes.assignNutritionPlan, element: <AssignNutritionPlan />},
              {path: routes.previewNutritionPlan, element: <AssignNutritionPlan />},
              {path: routes.forms, element: <Forms />},
              {path: routes.createForm, element: <FormEditor key="new" />},
              {path: routes.editForm, element: <FormEditor />},
              {path: routes.manageForm, element: <ManageForm />},
            ],
          },
          {path: routes.setup, element: <Setup />},
        ],
      },
      {path: '*', element: <NotFound />},
    ],
  },
]);
