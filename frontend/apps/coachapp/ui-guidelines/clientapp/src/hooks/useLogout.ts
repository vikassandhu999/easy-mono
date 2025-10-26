import { AuthAPI } from "@/api/auth";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

export const useHandleLogout = () => {
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await AuthAPI.logout();
      if (res.isError) {
        // Throw to trigger onError path
        throw res.error;
      }
      return res.getValue();
    },
    onSuccess: () => {
      notifications.show({
        title: "Logged out",
        message: "You have been logged out successfully",
        color: "green",
      });

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      notifications.show({
        title: "Logout failed",
        message: error?.message || "There was an error logging you out",
        color: "red",
      });
      navigate("/signin");
    },
  });

  return logoutMutation.mutate;
};
