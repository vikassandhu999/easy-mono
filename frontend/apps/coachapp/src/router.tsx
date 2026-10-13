import {useSyncExternalStore} from 'react';
import {
  createBrowserRouter,
  Link,
  matchPath,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useParams,
} from 'react-router-dom';
import {parseSession, sessionSnapshot, subscribeSession} from './api/session';
import {AppShell} from './app-shell';
import {AuthLayout} from './auth/auth-layout';
import {Invitation} from './auth/invitation';
import {Login} from './auth/login';
import {authPath, getReturnTo} from './auth/return-to';
import {Setup} from './auth/setup';
import {Signup} from './auth/signup';
import {Verify} from './auth/verify';
import {Welcome} from './auth/welcome';
import {BillingPage} from './billing/billing';
import {ClientTrackers} from './client-trackers/client-trackers';
import {RecordTracker} from './client-trackers/record-tracker';
import {TrackerHistory} from './client-trackers/tracker-history';
import {ClientWeekPrototype} from './client-week-prototype/client-week-prototype';
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
import {NutritionWeek} from './nutrition-week/nutrition-week';
import {NutritionWeekPrototype} from './nutrition-week-prototype/nutrition-week-prototype';
import {ReviewHistory} from './reviews/review-history';
import {ReviewScreen} from './reviews/review-screen';
import {routes} from './routes';
import {BusinessSettings, ProfileSettings} from './settings/settings';
import {InviteCoach} from './team/invite-coach';
import {Team} from './team/team';
import {TeamMemberPage} from './team/team-member';
import {TrackerTemplateEditor} from './tracker-templates/tracker-template-editor';
import {TrackerTemplates} from './tracker-templates/tracker-templates';
import {TrackerEditor} from './trackers/tracker-editor';
import {Trackers} from './trackers/trackers';
import {WorkoutBuilder} from './workout-builder/workout-builder';
import {WorkoutBuilderPrototype} from './workout-builder-prototype/workout-builder-prototype';
import {WorkoutWeek} from './workout-week/workout-week';
import {WorkoutLibrary} from './workouts/workouts';

function Gate({guest = false}: {guest?: boolean}) {
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const location = useLocation();
  if (guest) {
    return session ? (
      <Navigate
        to={getReturnTo(location.search)}
        replace
      />
    ) : (
      <Outlet />
    );
  }
  if (!session) {
    return (
      <Navigate
        to={authPath(routes.login, location.pathname + location.search + location.hash)}
        replace
      />
    );
  }
  if (session.tokens.scope !== 'coach' && location.pathname !== routes.setup) {
    return (
      <Navigate
        to={authPath(routes.setup, location.pathname + location.search + location.hash)}
        replace
      />
    );
  }
  if (session.tokens.scope === 'coach' && location.pathname === routes.setup) {
    return (
      <Navigate
        to={authPath(routes.welcome, getReturnTo(location.search))}
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
          location.pathname === routes.team ||
          location.pathname === routes.conversations ||
          location.pathname === routes.workouts ||
          location.pathname === routes.exercises ||
          location.pathname === routes.foods ||
          location.pathname === routes.trackers ||
          location.pathname === routes.trackerTemplates ||
          matchPath(routes.trackerHistory, location.pathname) ||
          location.pathname === routes.home
            ? location.pathname + location.search
            : location.key
        }
      />
    </>
  );
}

function ClientTraining() {
  const {id = ''} = useParams();
  return <WorkoutWeek clientId={id} />;
}

function ClientNutrition() {
  const {clientId = ''} = useParams();
  return <NutritionWeek clientId={clientId} />;
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
      // PROTOTYPE — throwaway route, no login or API.
      {path: routes.workoutBuilderPrototype, element: <WorkoutBuilderPrototype />},
      {path: routes.clientWeekPrototype, element: <ClientWeekPrototype />},
      {path: routes.nutritionWeekPrototype, element: <NutritionWeekPrototype />},
      {
        element: <Gate />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: '/',
                element: (
                  <Navigate
                    to={routes.home}
                    replace
                  />
                ),
              },
              {path: routes.home, element: <Clients />},
              {path: routes.newReview, element: <ReviewScreen />},
              {path: routes.reviews, element: <ReviewHistory />},
              {path: routes.trackers, element: <Trackers />},
              {path: routes.createTracker, element: <TrackerEditor />},
              {path: routes.tracker, element: <TrackerEditor />},
              {path: routes.trackerTemplates, element: <TrackerTemplates />},
              {path: routes.createTrackerTemplate, element: <TrackerTemplateEditor />},
              {path: routes.trackerTemplate, element: <TrackerTemplateEditor />},
              {path: routes.clientTrackers, element: <ClientTrackers />},
              {path: routes.recordTracker, element: <RecordTracker />},
              {path: routes.trackerHistory, element: <TrackerHistory />},
              {path: routes.team, element: <Team />},
              {path: routes.billing, element: <BillingPage />},
              {path: routes.inviteCoach, element: <InviteCoach />},
              {path: routes.teamMember, element: <TeamMemberPage />},
              {path: routes.changeClientCoach, element: <ChangeClientCoach />},
              {path: routes.profileSettings, element: <ProfileSettings />},
              {path: routes.businessSettings, element: <BusinessSettings />},
              {path: routes.inviteClient, element: <InviteClient />},
              {path: routes.client, element: <ClientOverview />},
              {path: routes.clientNutrition, element: <ClientNutrition />},
              {path: routes.clientProfile, element: <ClientProfile />},
              {path: routes.conversations, element: <Conversations />},
              {path: routes.clientConversation, element: <Conversation />},
              {path: routes.clientTraining, element: <ClientTraining />},
              {path: routes.workouts, element: <WorkoutLibrary />},
              {path: routes.createWorkout, element: <WorkoutBuilder />},
              {path: routes.workout, element: <WorkoutBuilder />},
              {path: routes.createClientWorkout, element: <WorkoutBuilder />},
              {path: routes.clientWorkout, element: <WorkoutBuilder />},
              {path: routes.exercises, element: <Exercises />},
              {path: routes.createExercise, element: <ExerciseEditor />},
              {path: routes.exercise, element: <ExerciseEditor />},
              {path: routes.foods, element: <Foods />},
              {path: routes.createFood, element: <FoodEditor />},
              {path: routes.food, element: <FoodEditor />},
            ],
          },
          {path: routes.setup, element: <Setup />},
          {path: routes.welcome, element: <Welcome />},
        ],
      },
      {path: '*', element: <NotFound />},
    ],
  },
]);
