import {createBrowserRouter, Navigate} from 'react-router-dom';

import AppShell from '@/@components/app-shell';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {withAuth} from '@/@hoc/with-auth';
import {withNotAuth} from '@/@hoc/with-not-auth';
import Login from '@/auth/login';
import RegisterBusiness from '@/auth/register-business';
import Signup from '@/auth/signup';
import VerifyLoginOtp from '@/auth/verify-login-otp';
import VerifySignupOtp from '@/auth/verify-signup-otp';
import ClientDetail from '@/clients/client-detail';
import ClientWorkoutHistoryPage from '@/clients/client-workout-history-page';
import EditClient from '@/clients/edit-client';
import InviteClient from '@/clients/invite-client';
import ListClients from '@/clients/list-clients';
import SessionDetail from '@/clients/session-detail';
import CreateExercise from '@/exercises/create-exercise';
import EditExercise from '@/exercises/edit-exercise';
import ExerciseDetail from '@/exercises/exercise-detail';
import ListExercises from '@/exercises/list-exercises';
import CreateFood from '@/foods/create-food';
import EditFood from '@/foods/edit-food';
import FoodDetail from '@/foods/food-detail';
import ListFoods from '@/foods/list-foods';
import Library from '@/library/library';
import CreateNutritionPlan from '@/nutrition-plans/create-nutrition-plan';
import EditNutritionPlan from '@/nutrition-plans/edit-nutrition-plan';
import ListNutritionPlans from '@/nutrition-plans/list-nutrition-plans';
import NutritionPlanDetail from '@/nutrition-plans/nutrition-plan-detail';
import CreateRecipe from '@/recipes/create-recipe';
import EditRecipe from '@/recipes/edit-recipe';
import ListRecipes from '@/recipes/list-recipes';
import RecipeDetail from '@/recipes/recipe-detail';
// Storefront hidden for MVP — uncomment for v2 release
// import CreateOffer from '@/storefront/create-offer';
// import CreateTestimonial from '@/storefront/create-testimonial';
// import EditOffer from '@/storefront/edit-offer';
// import EditTestimonial from '@/storefront/edit-testimonial';
// import ListOffers from '@/storefront/list-offers';
// import ListTestimonials from '@/storefront/list-testimonials';
// import Storefront from '@/storefront/storefront';
// import StorefrontEditor from '@/storefront/storefront-editor';
import CreateTrainingPlan from '@/training-plans/create-training-plan';
import EditTrainingPlan from '@/training-plans/edit-training-plan';
import ListTrainingPlans from '@/training-plans/list-training-plans';
import TrainingPlanDetail from '@/training-plans/training-plan-detail';

// ── Auth wrappers ────────────────────────────────────────────

const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);
const RegisterBusinessScreen = withAuth(RegisterBusiness);
const AppShellScreen = withAuth(AppShell);

// ── Placeholder ──────────────────────────────────────────────

function Placeholder({title}: {title: string}) {
  return (
    <PageLayout title={title}>
      <p className="text-sm text-foreground-500">This page is under construction.</p>
    </PageLayout>
  );
}

// ── Router ───────────────────────────────────────────────────

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
      {path: ROUTES.DASHBOARD, element: <Placeholder title="Dashboard" />},
      {path: ROUTES.CLIENTS, Component: ListClients},
      {path: ROUTES.INVITE_CLIENT, Component: InviteClient},
      {path: ROUTES.CLIENT_WORKOUT_HISTORY, Component: ClientWorkoutHistoryPage},
      {path: ROUTES.CLIENT_SESSION_DETAIL, Component: SessionDetail},
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
      {path: ROUTES.NUTRITION_PLAN_DETAIL, Component: NutritionPlanDetail},
      {path: ROUTES.EDIT_NUTRITION_PLAN, Component: EditNutritionPlan},
      {path: ROUTES.TRAINING_PLANS, Component: ListTrainingPlans},
      {path: ROUTES.CREATE_TRAINING_PLAN, Component: CreateTrainingPlan},
      {path: ROUTES.TRAINING_PLAN_DETAIL, Component: TrainingPlanDetail},
      {path: ROUTES.EDIT_TRAINING_PLAN, Component: EditTrainingPlan},
      // Storefront routes hidden for MVP — uncomment for v2 release
      // {path: ROUTES.STOREFRONT, Component: Storefront},
      // {path: ROUTES.STOREFRONT_PAGE, Component: StorefrontEditor},
      // {path: ROUTES.STOREFRONT_OFFERS, Component: ListOffers},
      // {path: ROUTES.CREATE_OFFER, Component: CreateOffer},
      // {path: ROUTES.EDIT_OFFER, Component: EditOffer},
      // {path: ROUTES.STOREFRONT_TESTIMONIALS, Component: ListTestimonials},
      // {path: ROUTES.CREATE_TESTIMONIAL, Component: CreateTestimonial},
      // {path: ROUTES.EDIT_TESTIMONIAL, Component: EditTestimonial},
      {path: ROUTES.SETTINGS, element: <Placeholder title="Settings" />},
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
