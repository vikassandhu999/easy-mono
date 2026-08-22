import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/app-shell';
import AcceptInvite from '@/auth/accept-invite';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyInviteOtp from '@/auth/verify-invite-otp';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';
import CheckinSubmission from '@/clients/client-checkin-submission';
import IntakeResponses from '@/clients/client-intake-responses';
import NutritionDay from '@/clients/client-nutrition-day';
import ProgressPhotos from '@/clients/client-progress-photos';
import ClientScreen from '@/clients/client-screen';
import WeightHistory from '@/clients/client-weight-history';
import EditClient from '@/clients/edit-client';
import InviteClient from '@/clients/invite-client';
import SessionDetail from '@/clients/session-detail';
import Dashboard from '@/dashboard/dashboard';
import LandingPageEditor from '@/landing/landing-page-editor';
import CheckinBuilderScreen from '@/library/checkins/checkin-builder-screen';
import CreateCheckin from '@/library/checkins/create-checkin';
import EditCheckin from '@/library/checkins/edit-checkin';
import ListCheckins from '@/library/checkins/list-checkins';
import ReviewCheckin from '@/library/checkins/review-checkin';
import CreateExercise from '@/library/exercises/create-exercise';
import EditExercise from '@/library/exercises/edit-exercise';
import ExerciseDetail from '@/library/exercises/exercise-detail';
import ListExercises from '@/library/exercises/list-exercises';
import CreateFood from '@/library/foods/create-food';
import EditFood from '@/library/foods/edit-food';
import FoodDetail from '@/library/foods/food-detail';
import ListFoods from '@/library/foods/list-foods';
import Library from '@/library/library';
import NutritionPlanBuilder from '@/library/nutrition-plans/builder/index';
import CreateNutritionPlan from '@/library/nutrition-plans/create-nutrition-plan';
import EditNutritionPlan from '@/library/nutrition-plans/edit-nutrition-plan';
import ListNutritionPlans from '@/library/nutrition-plans/list-nutrition-plans';
import CreateRecipe from '@/library/recipes/create-recipe';
import EditRecipe from '@/library/recipes/edit-recipe';
import ListRecipes from '@/library/recipes/list-recipes';
import RecipeDetail from '@/library/recipes/recipe-detail';
import TrainingPlanBuilder from '@/library/training-plans/builder/index';
import CreateTrainingPlan from '@/library/training-plans/create-training-plan';
import EditTrainingPlan from '@/library/training-plans/edit-training-plan';
import ListTrainingPlans from '@/library/training-plans/list-training-plans';
import ConversationPage from '@/messages/conversation-page';
import {ROUTES} from '@/routes';
import Settings from '@/settings/settings';
import {withAuth} from '@/with-auth';
import {withNotAuth} from '@/with-not-auth';
import WorkbenchScreen from '@/workbench/workbench-screen';

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
