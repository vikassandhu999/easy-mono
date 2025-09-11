import { AuthAPI, SignInCodeRequest } from "@/api/auth";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { useAuth } from "@/providers/AuthProvider";
import { Button, PinInput, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ArrowRightIcon } from "@phosphor-icons/react";
import {  IconCheck, IconX } from "@tabler/icons-react";
import React, { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";

const SignInCodePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignInCodeRequest>({
    initialValues: {
      token_id: params.get("token_id") || "",
      passcode: "",
      invitation_token: params.get("invitation_token") || undefined,
    },
    validate: {
      passcode: (value) => {
        if (!value) return "Please enter the verification code";
        if (value.length !== 6) return "Code must be 6 digits";
        return null;
      },
    },
  });

  const singInMutation = useMutation({
    mutationFn: async (data: SignInCodeRequest) => {
      return AuthAPI.signInCode(data);
    },
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async (res) => {
      console.log(res);

      if (res.isError) {
        notifications.show({
          title: "Verification failed",
          message: res.getError().message || "Invalid verification code",
          color: "red",
          icon: <IconX size={16} />,
        });
        return;
      }

      // Show success notification
      notifications.show({
        title: "Success!",
        message: "You have been signed in successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Force page reload to let the backend cookies take effect and update auth state
      setTimeout(() => {
        window.location.href = "/";
      }, 1000); // Small delay to let user see the success message
    },
    onError: (err) => {
      notifications.show({
        title: "Sign in failed",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const onSubmit = (values: SignInCodeRequest) => {
    singInMutation.mutate(values);
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <AuthLayout
      title="Email verification"
      subtitle={`We sent a 6-digit verification code to ${params.get("email")}`}
    >
      <form onSubmit={form.onSubmit(onSubmit)} style={{ width: "100%" }}>
        <Stack gap="sm" align="start">
          <Stack gap="xs" justify={"center"} align={"center"}>
            <PinInput
              length={6}
              type="number"
              radius="md"
              placeholder="○"
              {...form.getInputProps("passcode")}
              size={"lg"}
              w={"max-content"}
            />
            {form.errors.passcode && (
              <Text size="sm" c="red" ta="center" w={"100%"}>
                {form.errors.passcode}
              </Text>
            )}
          </Stack>

          <Button
            type="submit"
            variant="filled"
            fullWidth
            size="md"
            radius="md"
            loading={loading}
            rightSection={<ArrowRightIcon size={16} />}
          >
            Continue
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
};

export default SignInCodePage;
