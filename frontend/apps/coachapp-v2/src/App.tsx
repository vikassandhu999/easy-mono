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
import CreateExercise from '@/exercises/create-exercise';
import EditExercise from '@/exercises/edit-exercise';
import ExerciseDetail from '@/exercises/exercise-detail';
import ListExercises from '@/exercises/list-exercises';
import CreateFood from '@/foods/create-food';
import EditFood from '@/foods/edit-food';
import FoodDetail from '@/foods/food-detail';
import ListFoods from '@/foods/list-foods';
import Library from '@/library/library';
import CreateRecipe from '@/recipes/create-recipe';
import EditRecipe from '@/recipes/edit-recipe';
import ListRecipes from '@/recipes/list-recipes';
import RecipeDetail from '@/recipes/recipe-detail';

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
          element={<Placeholder title="Nutrition Plans" />}
          path={ROUTES.NUTRITION_PLANS}
        />
        <Route
          element={<Placeholder title="Nutrition Plan Detail" />}
          path={ROUTES.NUTRITION_PLAN_DETAIL}
        />
        <Route
          element={<Placeholder title="Training Plans" />}
          path={ROUTES.TRAINING_PLANS}
        />
        <Route
          element={<Placeholder title="Training Plan Detail" />}
          path={ROUTES.TRAINING_PLAN_DETAIL}
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
