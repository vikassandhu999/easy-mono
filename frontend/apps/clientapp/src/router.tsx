import {
  createBrowserRouter,
  LoaderFunctionArgs,
  redirect,
  RouterProvider,
} from "react-router";

import HomePage from "./views/Dashboard/HomePage";

import SignInPage from "./views/Auth/SignInPage";
import SignInCodePage from "./views/Auth/SignInCodePage";
import  TokenVerifyPage  from "./views/Auth/TokenVerify/TokenVerifyPage";

import { ProgramsAPI } from "@/api/Programs";

// onboarding components
import SignUpStepPage from "./views/Onboarding/SignUpStepPage";
import SignUpCodeStepPage from "./views/Onboarding/SignUpCodeStepPage";
import BusinessInfoStepPage from "./views/Onboarding/BusinessInfoStepPage";
import CoachInfoStepPage from "./views/Onboarding/CoachInfoStepPage";
import ProtectedRouteLayout from "./Utils/ProtectedRouteLayout";
import SchedulePage from "./views/Schedule";
import { PrivateRoute, PublicRoute } from "./Utils";
import ProfilePage from "./views/Profile";

// Data loaders
export async function programDetailLoader({ params }: LoaderFunctionArgs) {
  const id = params.id as string | undefined;
  if (!id) return redirect("/programs");

  try {
    const result = await ProgramsAPI.getProgram(id);
    if (result.isError) {
      throw new Response(result.error?.message || "Failed to load program", {
        status: 404,
        statusText: "Program Not Found",
      });
    }
    return result.getValue();
  } catch (error) {
    throw new Response("Network error loading program", {
      status: 500,
      statusText: "Server Error",
    });
  }
}

const router = createBrowserRouter([

  // auth routes - redirect to "/" if already authenticated
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/signin",
        element: <SignInPage />,
      },
      {
        path: "/signin/code",
        element: <SignInCodePage />,
      },
      {
        path: "/verify",
        element: <TokenVerifyPage />,
      },
      {
        path: "/signup",
        element: <SignUpStepPage />,
      },
      // onboarding Routes
      {
        path: "/signup/verify",
        element: <SignUpCodeStepPage />,
      },
      {
        path: "/onboarding/business",
        element: <BusinessInfoStepPage />,
      },
      {
        path: "/onboarding/profile",
        element: <CoachInfoStepPage />,
      },
    ]
  },

  // Protected routes - require authentication
  {

    element : <PrivateRoute />, 
    children : [
      {
        element: <ProtectedRouteLayout />,
        children: [
          // Routes with layout
          {
            path: "/",
            element: <HomePage />,
          },
          {
            path: "/schedule",
            element: <SchedulePage />,
          },
          {
            path : "/profile",
            element : <ProfilePage />
          }
        ]
      }
    ]
  },
]);

const AppRouterProvider = () => {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
};

export default AppRouterProvider;
