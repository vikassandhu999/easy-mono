import {Navigate, Route, Routes} from 'react-router';

import AppShell from '@/app/layout/AppShell';
import GuestRoute from '@/app/layout/GuestRoute';
import MainLayout from '@/app/layout/MainLayout';
import PrivateRoute from '@/app/layout/PrivateRoute';
import AuthLayout from '@/features/auth/AuthLayout';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import VerifyPage from '@/features/auth/VerifyPage';
import ClientsPage from '@/features/clients/ClientsPage';
import ClientViewPage from '@/features/clients/ClientViewPage';
import ExerciseEditorPage from '@/features/library/exercises/ExerciseEditorPage';
import ExerciseFormPage from '@/features/library/exercises/ExerciseFormPage';
import ExercisePickerPage from '@/features/library/exercises/ExercisePickerPage';
import FoodFormPage from '@/features/library/foods/FoodFormPage';
import LibraryPage from '@/features/library/LibraryPage';
import NutritionPlanAddAssignmentPage from '@/features/library/nutrition-plans/NutritionPlanAddAssignmentPage';
import NutritionPlanAssignmentEditorPage from '@/features/library/nutrition-plans/NutritionPlanAssignmentEditorPage';
import NutritionPlanBuilderPage from '@/features/library/nutrition-plans/NutritionPlanBuilderPage';
import NutritionPlanFormPage from '@/features/library/nutrition-plans/NutritionPlanFormPage';
import NutritionPlanMealEditorPage from '@/features/library/nutrition-plans/NutritionPlanMealEditorPage';
import RecipeFormPage from '@/features/library/recipes/RecipeFormPage';
import TrainingPlanBuilderPage from '@/features/library/training-plans/TrainingPlanBuilderPage';
import TrainingPlanFormPage from '@/features/library/training-plans/TrainingPlanFormPage';
import WorkoutDetailPage from '@/features/library/training-plans/WorkoutDetailPage';
import OnboardingPage from '@/features/onboarding/OnboardingPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route
            element={<RegisterPage />}
            path="/register"
          />
          <Route
            element={<VerifyPage />}
            path="/register/verify"
          />
          <Route
            element={<LoginPage />}
            path="/login"
          />
          <Route
            element={<VerifyPage />}
            path="/login/verify"
          />
        </Route>
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route element={<MainLayout />}>
            <Route
              element={<OnboardingPage />}
              path="/onboarding"
            />
            <Route
              element={<ClientsPage />}
              path="/clients"
            />
            <Route
              element={<ClientViewPage />}
              path="/clients/:id"
            />
            <Route
              element={<LibraryPage />}
              path="/library"
            />
            <Route
              element={<span>My Page</span>}
              path="/page"
            />
            <Route
              element={<span>Settings</span>}
              path="/settings"
            />
          </Route>

          <Route
            element={<NutritionPlanFormPage />}
            path="/library/nutrition-plans/new"
          />
          <Route
            element={<NutritionPlanFormPage />}
            path="/library/nutrition-plans/:id/edit"
          />
          <Route
            element={<NutritionPlanBuilderPage />}
            path="/library/nutrition-plans/:id/builder"
          />
          <Route
            element={<NutritionPlanAddAssignmentPage />}
            path="/library/nutrition-plans/:id/builder/add-assignment"
          />
          <Route
            element={<NutritionPlanAssignmentEditorPage />}
            path="/library/nutrition-plans/:id/builder/assignments/:planItemId/edit"
          />
          <Route
            element={<NutritionPlanMealEditorPage />}
            path="/library/nutrition-plans/:id/builder/meals/:mealId/edit"
          />
          <Route
            element={<TrainingPlanFormPage />}
            path="/library/training-plans/new"
          />
          <Route
            element={<TrainingPlanFormPage />}
            path="/library/training-plans/:id/edit"
          />
          <Route
            element={<TrainingPlanBuilderPage />}
            path="/library/training-plans/:id/builder"
          />
          <Route
            element={<WorkoutDetailPage />}
            path="/library/training-plans/:id/builder/workouts/:workoutId"
          />
          <Route
            element={<ExercisePickerPage />}
            path="/library/training-plans/:id/builder/workouts/:workoutId/exercises/new"
          />
          <Route
            element={<ExerciseEditorPage />}
            path="/library/training-plans/:id/builder/workouts/:workoutId/exercises/new/:exerciseId"
          />
          <Route
            element={<ExerciseEditorPage />}
            path="/library/training-plans/:id/builder/workouts/:workoutId/exercises/:elementId"
          />
          <Route
            element={<FoodFormPage />}
            path="/library/foods/new"
          />
          <Route
            element={<FoodFormPage />}
            path="/library/foods/:id/edit"
          />
          <Route
            element={<ExerciseFormPage />}
            path="/library/exercises/new"
          />
          <Route
            element={<ExerciseFormPage />}
            path="/library/exercises/:id/edit"
          />
          <Route
            element={<RecipeFormPage />}
            path="/library/recipes/new"
          />
          <Route
            element={<RecipeFormPage />}
            path="/library/recipes/:id/edit"
          />
        </Route>
      </Route>

      <Route
        element={
          <Navigate
            replace
            to="/login"
          />
        }
        path="/"
      />
      <Route
        element={<span>Not Found</span>}
        path="*"
      />
    </Routes>
  );
}
