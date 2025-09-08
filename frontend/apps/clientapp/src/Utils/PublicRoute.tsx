import { Navigate, Outlet } from "react-router";
import { Loader, Center } from "@mantine/core";
import { useAuth } from "@/providers/AuthProvider";

const PublicRoute = () => {
  const { isAuthenticated, isAuthenticating } = useAuth();

  if (isAuthenticating) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // If user is authenticated, redirect to home page
  // If user is not authenticated, allow access to public routes (auth pages)
  return isAuthenticated ? <Navigate to="/" /> : <Outlet />;
};

export default PublicRoute;
