import { Spinner } from "@heroui/react";
import { Navigate, Outlet } from "react-router";

import {
  selectIsAuthenticated,
  selectIsAuthenticating,
} from "@/slices/authSlice";
import { useAppSelector } from "@/store";

const GuestGaurd = () => {
  const isAuthenticating = useAppSelector(selectIsAuthenticating);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticating) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return isAuthenticated ? <Navigate to="/" /> : <Outlet />;
};

export default GuestGaurd;
