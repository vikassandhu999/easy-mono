import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import AcceptInvite from '@/auth/accept-invite';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyInviteOtp from '@/auth/verify-invite-otp';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';
import CheckinBuilderScreen from '@/checkins/checkin-builder-screen';
import CreateCheckin from '@/checkins/create-checkin';
import EditCheckin from '@/checkins/edit-checkin';
import ListCheckins from '@/checkins/list-checkins';
import ReviewCheckin from '@/checkins/review-checkin';
import ClientScreen from '@/clients/client-screen';
import CheckinSubmission from '@/clients/client-screen/checkin-submission';
import IntakeResponses from '@/clients/client-screen/intake-responses';
import NutritionDay from '@/clients/client-screen/nutrition-day';
import ProgressPhotos from '@/clients/client-screen/progress-photos';
import WeightHistory from '@/clients/client-screen/weight-history';
import EditClient from '@/clients/edit-client';
import InviteClient from '@/clients/invite-client';
import SessionDetail from '@/clients/session-detail';
import WorkbenchScreen from '@/clients/workbench/workbench-screen';
import Dashboard from '@/dashboard/dashboard';
import CreateExercise from '@/exercises/create-exercise';
import EditExercise from '@/exercises/edit-exercise';
import ExerciseDetail from '@/exercises/exercise-detail';
import ListExercises from '@/exercises/list-exercises';
import CreateFood from '@/foods/create-food';
import EditFood from '@/foods/edit-food';
import FoodDetail from '@/foods/food-detail';
import ListFoods from '@/foods/list-foods';
import LandingPageEditor from '@/landing/landing-page-editor';
import Library from '@/library/library';
import ConversationPage from '@/messages/conversation-page';
import NutritionPlanBuilder from '@/nutrition-plans/builder';
import CreateNutritionPlan from '@/nutrition-plans/create-nutrition-plan';
import EditNutritionPlan from '@/nutrition-plans/edit-nutrition-plan';
import ListNutritionPlans from '@/nutrition-plans/list-nutrition-plans';
import CreateRecipe from '@/recipes/create-recipe';
import EditRecipe from '@/recipes/edit-recipe';
import ListRecipes from '@/recipes/list-recipes';
import RecipeDetail from '@/recipes/recipe-detail';
import Settings from '@/settings/settings';
import TrainingPlanBuilder from '@/training-plans/builder';
import CreateTrainingPlan from '@/training-plans/create-training-plan';
import EditTrainingPlan from '@/training-plans/edit-training-plan';
import ListTrainingPlans from '@/training-plans/list-training-plans';

const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);
const RegisterBusinessScreen = withAuth(RegisterBusiness);
const AppShellScreen = withAuth(AppShell);

export const router = createBrowserRouter([
  // Public
  {path: ROUTES.LOGIN, Component: LoginScreen},
  {path: ROUTES.SIGNUP, Component: SignupScreen},
  {path: ROUTES.VERIFY_LOGIN_OTP, Component: VerifyLoginOtp},
  {path: ROUTES.VERIFY_SIGNUP_OTP, Component: VerifySignupOtp},
  {path: ROUTES.ACCEPT_INVITE, Component: AcceptInvite},
  {path: ROUTES.VERIFY_INVITE_OTP, Component: VerifyInviteOtp},

  // Onboarding (protected, no shell)
  {path: ROUTES.REGISTER_BUSINESS, Component: RegisterBusinessScreen},

  // App (protected, with shell)
  {
    Component: AppShellScreen,
    children: [
      // Coach home (also the post-onboarding + catch-all target).
      {path: ROUTES.DASHBOARD, Component: Dashboard},
      {path: ROUTES.CLIENTS, Component: WorkbenchScreen},
      {path: ROUTES.INVITE_CLIENT, Component: InviteClient},
      {path: ROUTES.CLIENT_DETAIL, Component: ClientScreen},
      {path: ROUTES.CLIENT_SESSION_DETAIL, Component: SessionDetail},
      {path: ROUTES.CLIENT_WEIGHT, Component: WeightHistory},
      {path: ROUTES.CLIENT_INTAKE, Component: IntakeResponses},
      {path: ROUTES.CLIENT_CHECKIN_SUBMISSION, Component: CheckinSubmission},
      {path: ROUTES.CLIENT_NUTRITION_DAY, Component: NutritionDay},
      {path: ROUTES.CLIENT_PHOTOS, Component: ProgressPhotos},
      {path: ROUTES.CLIENT_EDIT, Component: EditClient},
      {path: ROUTES.CLIENT_MESSAGES, Component: ConversationPage},
      {path: ROUTES.LIBRARY, Component: Library},
      {path: ROUTES.EXERCISES, Component: ListExercises},
      {path: ROUTES.CREATE_EXERCISE, Component: CreateExercise},
      {path: ROUTES.EXERCISE_DETAIL, Component: ExerciseDetail},
      {path: ROUTES.EDIT_EXERCISE, Component: EditExercise},
      {path: ROUTES.FOODS, Component: ListFoods},
      {path: ROUTES.CREATE_FOOD, Component: CreateFood},
      {path: ROUTES.FOOD_DETAIL, Component: FoodDetail},
      {path: ROUTES.EDIT_FOOD, Component: EditFood},
      {path: ROUTES.RECIPES, Component: ListRecipes},
      {path: ROUTES.CREATE_RECIPE, Component: CreateRecipe},
      {path: ROUTES.RECIPE_DETAIL, Component: RecipeDetail},
      {path: ROUTES.EDIT_RECIPE, Component: EditRecipe},
      {path: ROUTES.NUTRITION_PLANS, Component: ListNutritionPlans},
      {path: ROUTES.CREATE_NUTRITION_PLAN, Component: CreateNutritionPlan},
      {path: ROUTES.NUTRITION_PLAN_DETAIL, Component: NutritionPlanBuilder},
      {path: ROUTES.EDIT_NUTRITION_PLAN, Component: EditNutritionPlan},
      {path: ROUTES.TRAINING_PLANS, Component: ListTrainingPlans},
      {path: ROUTES.CREATE_TRAINING_PLAN, Component: CreateTrainingPlan},
      {path: ROUTES.TRAINING_PLAN_DETAIL, Component: TrainingPlanBuilder},
      {path: ROUTES.EDIT_TRAINING_PLAN, Component: EditTrainingPlan},
      {path: ROUTES.CHECKINS, Component: ListCheckins},
      {path: ROUTES.CHECKIN_REVIEW, Component: ReviewCheckin},
      {path: ROUTES.CREATE_CHECKIN, Component: CreateCheckin},
      {path: ROUTES.CHECKIN_BUILDER, Component: CheckinBuilderScreen},
      {path: ROUTES.EDIT_CHECKIN, Component: EditCheckin},
      {path: ROUTES.SETTINGS, Component: Settings},
      {path: ROUTES.SETTINGS_LANDING_PAGE, Component: LandingPageEditor},
      {path: ROUTES.SETTINGS_TAB, Component: Settings},
    ],
  },

  // Catch-all
  {
    path: '*',
    element: (
      <Navigate
        replace
        to={ROUTES.DASHBOARD}
      />
    ),
  },
]);
