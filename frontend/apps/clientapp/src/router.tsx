import { createBrowserRouter, RouterProvider } from "react-router";

import HomePage from "./views/dashboard/HomePage";

import SignInPage from "./views/auth/SignInPage";
import SignInCodePage from "./views/auth/SignInCodePage";

import ProtectedRouteLayout from "./utils/ProtectedRouteLayout";
import SchedulePage from "./views/schedule";
import { PrivateRoute, PublicRoute } from "./utils";
import ProfilePage from "./views/profile";
import VerifyInvitationLinkPage from "./views/auth/VerifyInvitationLinkPage";

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
        element: <VerifyInvitationLinkPage />,
      },
    ],
  },

  // Protected routes - require authentication
  {
    element: <PrivateRoute />,
    children: [
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
            path: "/profile",
            element: <ProfilePage />,
          },
        ],
      },
    ],
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
