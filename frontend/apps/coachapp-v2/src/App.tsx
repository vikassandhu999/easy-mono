import {Navigate, Route, Routes} from 'react-router-dom';

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
import CreateOffer from '@/storefront/create-offer';
import CreateTestimonial from '@/storefront/create-testimonial';
import EditOffer from '@/storefront/edit-offer';
import EditTestimonial from '@/storefront/edit-testimonial';
import ListOffers from '@/storefront/list-offers';
import ListTestimonials from '@/storefront/list-testimonials';
import Storefront from '@/storefront/storefront';
import StorefrontEditor from '@/storefront/storefront-editor';
import CreateTrainingPlan from '@/training-plans/create-training-plan';
import EditTrainingPlan from '@/training-plans/edit-training-plan';
import ListTrainingPlans from '@/training-plans/list-training-plans';
import TrainingPlanDetail from '@/training-plans/training-plan-detail';

// Public screens (redirect away if already authenticated)
const LoginScreen = withNotAuth(Login);
const SignupScreen = withNotAuth(Signup);

// Protected screens
const RegisterBusinessScreen = withAuth(RegisterBusiness);
const AppShellScreen = withAuth(AppShell);

// Placeholder page for features not yet built
function Placeholder({title}: {title: string}) {
  return (
    <PageLayout title={title}>
      <p className="text-sm text-foreground-500">This page is under construction.</p>
    </PageLayout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        element={<LoginScreen />}
        path={ROUTES.LOGIN}
      />
      <Route
        element={<SignupScreen />}
        path={ROUTES.SIGNUP}
      />
      <Route
        element={<VerifyLoginOtp />}
        path={ROUTES.VERIFY_LOGIN_OTP}
      />
      <Route
        element={<VerifySignupOtp />}
        path={ROUTES.VERIFY_SIGNUP_OTP}
      />

      {/* Onboarding (protected, no shell) */}
      <Route
        element={<RegisterBusinessScreen />}
        path={ROUTES.REGISTER_BUSINESS}
      />

      {/* App (protected, with shell) */}
      <Route element={<AppShellScreen />}>
        <Route
          element={<Placeholder title="Dashboard" />}
          path={ROUTES.DASHBOARD}
        />
        <Route
          element={<ListClients />}
          path={ROUTES.CLIENTS}
        />
        <Route
          element={<InviteClient />}
          path={ROUTES.INVITE_CLIENT}
        />
        <Route
          element={<SessionDetail />}
          path={ROUTES.CLIENT_SESSION_DETAIL}
        />
        <Route
          element={<ClientDetail />}
          path={ROUTES.CLIENT_DETAIL}
        />
        <Route
          element={<EditClient />}
          path={ROUTES.EDIT_CLIENT}
        />
        <Route
          element={<Library />}
          path={ROUTES.LIBRARY}
        />
        <Route
          element={<ListExercises />}
          path={ROUTES.EXERCISES}
        />
        <Route
          element={<CreateExercise />}
          path={ROUTES.CREATE_EXERCISE}
        />
        <Route
          element={<ExerciseDetail />}
          path={ROUTES.EXERCISE_DETAIL}
        />
        <Route
          element={<EditExercise />}
          path={ROUTES.EDIT_EXERCISE}
        />
        <Route
          element={<ListFoods />}
          path={ROUTES.FOODS}
        />
        <Route
          element={<CreateFood />}
          path={ROUTES.CREATE_FOOD}
        />
        <Route
          element={<FoodDetail />}
          path={ROUTES.FOOD_DETAIL}
        />
        <Route
          element={<EditFood />}
          path={ROUTES.EDIT_FOOD}
        />
        <Route
          element={<ListRecipes />}
          path={ROUTES.RECIPES}
        />
        <Route
          element={<CreateRecipe />}
          path={ROUTES.CREATE_RECIPE}
        />
        <Route
          element={<RecipeDetail />}
          path={ROUTES.RECIPE_DETAIL}
        />
        <Route
          element={<EditRecipe />}
          path={ROUTES.EDIT_RECIPE}
        />
        <Route
          element={<ListNutritionPlans />}
          path={ROUTES.NUTRITION_PLANS}
        />
        <Route
          element={<CreateNutritionPlan />}
          path={ROUTES.CREATE_NUTRITION_PLAN}
        />
        <Route
          element={<NutritionPlanDetail />}
          path={ROUTES.NUTRITION_PLAN_DETAIL}
        />
        <Route
          element={<EditNutritionPlan />}
          path={ROUTES.EDIT_NUTRITION_PLAN}
        />
        <Route
          element={<ListTrainingPlans />}
          path={ROUTES.TRAINING_PLANS}
        />
        <Route
          element={<CreateTrainingPlan />}
          path={ROUTES.CREATE_TRAINING_PLAN}
        />
        <Route
          element={<TrainingPlanDetail />}
          path={ROUTES.TRAINING_PLAN_DETAIL}
        />
        <Route
          element={<EditTrainingPlan />}
          path={ROUTES.EDIT_TRAINING_PLAN}
        />
        <Route
          element={<Storefront />}
          path={ROUTES.STOREFRONT}
        />
        <Route
          element={<StorefrontEditor />}
          path={ROUTES.STOREFRONT_PAGE}
        />
        <Route
          element={<ListOffers />}
          path={ROUTES.STOREFRONT_OFFERS}
        />
        <Route
          element={<CreateOffer />}
          path={ROUTES.CREATE_OFFER}
        />
        <Route
          element={<EditOffer />}
          path={ROUTES.EDIT_OFFER}
        />
        <Route
          element={<ListTestimonials />}
          path={ROUTES.STOREFRONT_TESTIMONIALS}
        />
        <Route
          element={<CreateTestimonial />}
          path={ROUTES.CREATE_TESTIMONIAL}
        />
        <Route
          element={<EditTestimonial />}
          path={ROUTES.EDIT_TESTIMONIAL}
        />
        <Route
          element={<Placeholder title="Settings" />}
          path={ROUTES.SETTINGS}
        />
      </Route>

      {/* Catch-all */}
      <Route
        element={
          <Navigate
            replace
            to={ROUTES.DASHBOARD}
          />
        }
        path="*"
      />
    </Routes>
  );
}
