import {Toast} from '@heroui/react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router';

import AppShell from '@/components/layout/AppShell';
import GuestRoute from '@/components/layout/GuestRoute';
import MainLayout from '@/components/layout/MainLayout';
import PrivateRoute from '@/components/layout/PrivateRoute';
import AuthLayout from '@/pages/auth/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import VerifyPage from '@/pages/auth/VerifyPage';
import ClientViewPage from '@/pages/clients/ClientViewPage';
import ExerciseEditorPage from '@/pages/library/exercises/ExerciseEditorPage';
import ExerciseFormPage from '@/pages/library/exercises/ExerciseFormPage';
import ExercisePickerPage from '@/pages/library/exercises/ExercisePickerPage';
import FoodFormPage from '@/pages/library/foods/FoodFormPage';
import LibraryPage from '@/pages/library/LibraryPage';
import NutritionPlanAddAssignmentPage from '@/pages/library/nutrition-plans/NutritionPlanAddAssignmentPage';
import NutritionPlanAssignmentEditorPage from '@/pages/library/nutrition-plans/NutritionPlanAssignmentEditorPage';
import NutritionPlanBuilderPage from '@/pages/library/nutrition-plans/NutritionPlanBuilderPage';
import NutritionPlanFormPage from '@/pages/library/nutrition-plans/NutritionPlanFormPage';
import NutritionPlanMealEditorPage from '@/pages/library/nutrition-plans/NutritionPlanMealEditorPage';
import RecipeFormPage from '@/pages/library/recipes/RecipeFormPage';
import TrainingPlanBuilderPage from '@/pages/library/training-plans/TrainingPlanBuilderPage';
import TrainingPlanFormPage from '@/pages/library/training-plans/TrainingPlanFormPage';
import WorkoutDetailPage from '@/pages/library/training-plans/WorkoutDetailPage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';

import ClientsPage from './pages/clients/ClientsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toast.Provider />
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
          {/* AppShell provides the persistent desktop sidebar for all authenticated pages */}
          <Route element={<AppShell />}>
            {/* Top-level pages — MainLayout adds the mobile bottom nav */}
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

            {/* Internal pages — desktop sidebar only, no mobile bottom nav */}
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
    </BrowserRouter>
  );
}
