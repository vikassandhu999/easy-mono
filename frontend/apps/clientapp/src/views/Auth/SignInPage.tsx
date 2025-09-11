import React, { useCallback, useState } from "react";
import { SignInRequest, AuthAPI } from "@/api/auth";
import { createSearchParams, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/providers/AuthProvider";
import { useForm } from "@mantine/form";
import { TextInput, Button, Stack } from "@mantine/core";
import { IconMail, IconCheck, IconX } from "@tabler/icons-react";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

const SignInPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignInRequest>({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+\.\S+$/.test(value) && !/^\d{10}$/.test(value)) {
          return "Please enter a valid email address";
        }
        return null;
      },
    },
  });

  const singInMutation = useMutation({
    mutationFn: async (data: SignInRequest) => {
      return AuthAPI.signIn(data);
    },
    onMutate: () => {
      setLoading(true);
    },
    onError: (err) => {
      notifications.show({
        title: "Sign in failed",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
    onSuccess: (res, data) => {
      console.log(res);

      // Check if the result has an error
      if (res.isError) {
        notifications.show({
          title: "Sign in failed",
          message: res.getError().message || "Sign in failed",
          color: "red",
          icon: <IconX size={16} />,
        });
        return;
      }

      // Show success notification
      const result = res.getValue();
      notifications.show({
        title: "Success!",
        message:
          result.message || "We've sent a verification code to your email",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // From result add token_id to query params
      const params = createSearchParams([
        ["token_id", result.token_id],
        ["email", data.email],
      ]);
      navigate("/signin/code?" + params.toString());
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const onSubmit = useCallback(
    (values: SignInRequest) => {
      singInMutation.mutate(values);
    },
    [singInMutation]
  );

  if (isAuthenticated) {
    return <Navigate to={"/"} />;
  }

  return (
    <AuthLayout
      title="Welcome back!"
      subtitle="Sign in to access your coaching schedules."
    >
      {/* Form */}
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="sm" align="start">
          <TextInput
            label="Email address"
            placeholder="awesomeclient@coacheasy.com"
            type="email"
            size="md"
            leftSection={<IconMail size={16} />}
            w={"100%"}
            {...form.getInputProps("email")}
          />

          <Button
            type="submit"
            variant="filled"
            fullWidth
            size="md"
            radius="md"
            rightSection={<ArrowRightIcon />}
            loading={loading}
          >
            Continue
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
};

export default SignInPage;
