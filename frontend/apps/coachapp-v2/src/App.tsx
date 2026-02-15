import { Toast } from "@heroui/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import GuestRoute from "@/components/GuestRoute";
import MainLayout from "@/components/MainLayout";
import PrivateRoute from "@/components/PrivateRoute";
import AuthLayout from "@/pages/auth/AuthLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyPage from "@/pages/auth/VerifyPage";
import ClientViewPage from "@/pages/clients/ClientViewPage";
import FoodFormPage from "@/pages/library/FoodFormPage";
import LibraryPage from "@/pages/library/LibraryPage";
import NutritionPlanAddAssignmentPage from "@/pages/library/NutritionPlanAddAssignmentPage";
import NutritionPlanAssignmentEditorPage from "@/pages/library/NutritionPlanAssignmentEditorPage";
import NutritionPlanBuilderPage from "@/pages/library/NutritionPlanBuilderPage";
import NutritionPlanFormPage from "@/pages/library/NutritionPlanFormPage";
import NutritionPlanMealEditorPage from "@/pages/library/NutritionPlanMealEditorPage";
import RecipeFormPage from "@/pages/library/RecipeFormPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";

import ClientsPage from "./pages/clients/ClientsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Toast.Provider />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route element={<RegisterPage />} path="/register" />
            <Route element={<VerifyPage />} path="/register/verify" />
            <Route element={<LoginPage />} path="/login" />
            <Route element={<VerifyPage />} path="/login/verify" />
          </Route>
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route element={<OnboardingPage />} path="/onboarding" />
            <Route element={<ClientsPage />} path="/clients" />
            <Route element={<ClientViewPage />} path="/clients/:id" />
            <Route element={<LibraryPage />} path="/library" />
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
            <Route element={<FoodFormPage />} path="/library/foods/new" />
            <Route element={<FoodFormPage />} path="/library/foods/:id/edit" />
            <Route element={<RecipeFormPage />} path="/library/recipes/new" />
            <Route
              element={<RecipeFormPage />}
              path="/library/recipes/:id/edit"
            />
            <Route element={<span>My Page</span>} path="/page" />
            <Route element={<span>Settings</span>} path="/settings" />
          </Route>
        </Route>

        <Route element={<Navigate replace to="/login" />} path="/" />
        <Route element={<span>Not Found</span>} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
