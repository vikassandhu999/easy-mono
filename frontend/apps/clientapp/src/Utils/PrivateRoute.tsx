import { Navigate, Outlet } from "react-router";
import { Loader, Center } from "@mantine/core";
import { useAuth } from "@/providers/AuthProvider";

const PrivateRoute = () => {
  const { isAuthenticated, isAuthenticating } = useAuth();
  if (isAuthenticating) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" />;
};

export default PrivateRoute;
