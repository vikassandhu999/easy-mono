import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';
import CreateCheckin from '@/checkins/create-checkin';
import EditCheckin from '@/checkins/edit-checkin';
import ListCheckins from '@/checkins/list-checkins';
import ClientDetail from '@/clients/client-detail';
import ClientProfilePage from '@/clients/client-profile';
import ClientWorkoutHistoryPage from '@/clients/client-workout-history-page';
import EditClient from '@/clients/edit-client';
import InviteClient from '@/clients/invite-client';
import ListClients from '@/clients/list-clients';
import SessionDetail from '@/clients/session-detail';
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
import CreateNutritionPlan from '@/nutrition-plans/create-nutrition-plan';
import EditNutritionPlan from '@/nutrition-plans/edit-nutrition-plan';
import ListNutritionPlans from '@/nutrition-plans/list-nutrition-plans';
import NutritionPlanBuilder from '@/nutrition-plans/plan-builder/nutrition-plan-builder';
import EnrollProspect from '@/prospects/enroll-prospect';
import ListProspects from '@/prospects/list-prospects';
import ProspectDetail from '@/prospects/prospect-detail';
import CreateRecipe from '@/recipes/create-recipe';
import EditRecipe from '@/recipes/edit-recipe';
import ListRecipes from '@/recipes/list-recipes';
import RecipeDetail from '@/recipes/recipe-detail';
import ProfileFields from '@/settings/profile-fields';
import Settings from '@/settings/settings';
import CreateTrainingPlan from '@/training-plans/create-training-plan';
import EditTrainingPlan from '@/training-plans/edit-training-plan';
import ListTrainingPlans from '@/training-plans/list-training-plans';
import TrainingPlanDetail from '@/training-plans/plan-builder/plan-builder';

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

  // Onboarding (protected, no shell)
  {path: ROUTES.REGISTER_BUSINESS, Component: RegisterBusinessScreen},

  // App (protected, with shell)
  {
    Component: AppShellScreen,
    children: [
      // Coach home (also the post-onboarding + catch-all target).
      {path: ROUTES.DASHBOARD, Component: Dashboard},
      {path: ROUTES.CLIENTS, Component: ListClients},
      {path: ROUTES.INVITE_CLIENT, Component: InviteClient},
      {path: ROUTES.CLIENT_WORKOUT_HISTORY, Component: ClientWorkoutHistoryPage},
      {path: ROUTES.CLIENT_SESSION_DETAIL, Component: SessionDetail},
      {path: ROUTES.CLIENT_PROFILE, Component: ClientProfilePage},
      {path: ROUTES.CLIENT_DETAIL, Component: ClientDetail},
      {path: ROUTES.EDIT_CLIENT, Component: EditClient},
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
      {path: ROUTES.TRAINING_PLAN_DETAIL, Component: TrainingPlanDetail},
      {path: ROUTES.EDIT_TRAINING_PLAN, Component: EditTrainingPlan},
      {path: ROUTES.CHECKINS, Component: ListCheckins},
      {path: ROUTES.CREATE_CHECKIN, Component: CreateCheckin},
      {path: ROUTES.EDIT_CHECKIN, Component: EditCheckin},
      {path: ROUTES.PROSPECTS, Component: ListProspects},
      {path: ROUTES.ENROLL_PROSPECT, Component: EnrollProspect},
      {path: ROUTES.PROSPECT_DETAIL, Component: ProspectDetail},
      {path: ROUTES.SETTINGS, Component: Settings},
      {path: ROUTES.SETTINGS_PROFILE_FIELDS, Component: ProfileFields},
      {path: ROUTES.SETTINGS_LANDING_PAGE, Component: LandingPageEditor},
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
