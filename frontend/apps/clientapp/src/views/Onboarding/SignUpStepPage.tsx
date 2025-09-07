import React from "react";
import { Controller, useForm } from "react-hook-form";
import { createSearchParams, useNavigate } from "react-router";
import { SignUpProps, SignUp_zod, UsersAPI } from "@/Api/Users";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextInput, Text, Anchor, Group } from "@mantine/core";
import { IconMail, IconInfoCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { AuthLayout } from "@/Components/Layouts/AuthLayout";
import { ArrowRightIcon } from "@phosphor-icons/react";

const signUpResolver = zodResolver(SignUp_zod);

const SignUpStepPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpProps>({
    defaultValues: { email: "" },
    resolver: signUpResolver,
  });

  const onSubmit = async (data: SignUpProps) => {
    try {
      const res = await UsersAPI.signUp(data);
      if (res.isError) {
        notifications.show({
          title: "Error",
          message: res.getError().message,
          color: "red",
          icon: <IconInfoCircle size={16} />,
        });
        throw res.getError();
      }

      notifications.show({
        title: "Success",
        message: "Verification code sent to your email",
        color: "green",
      });

      navigate(
        "/signup/verify?" +
          createSearchParams([
            ["token_id", res.getValue().token_id],
            ["email", data.email],
          ]).toString()
      );
    } catch (error) {
      // Error already handled above
    }
  };

  return (
    <AuthLayout
      subtitle="Boost your productivity and grow your client base effortlessly."
      title="Let's get started."
    >
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} gap="lg">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextInput
              {...field}
              error={errors?.email?.message}
              label="Email Address"
              placeholder="Enter your email"
              size="md"
              radius="sm"
              leftSection={<IconMail size={16} />}
              h={48}
            />
          )}
        />

        <Button
          type="submit"
          size="md"
          radius="sm"
          loading={isSubmitting}
          rightSection={<ArrowRightIcon size={20} />}
          fullWidth
          h={48}
        >
          Continue
        </Button>

        {/* Footer Actions */}
        <Stack gap="md">
          <Group justify="start" gap="xs">
            <Text size="sm" c="dimmed">
              Already have an account?
            </Text>
            <Anchor
              size="sm"
              fw={500}
              onClick={() => navigate("/login")}
              style={{ cursor: "pointer" }}
            >
              Login here
            </Anchor>
          </Group>

          <Text ta="left" size="xs" c="dimmed">
            By clicking on Continue, you agree to our Terms of Service and
            Privacy Policy
          </Text>
        </Stack>
      </Stack>
    </AuthLayout>
  );
};

export default SignUpStepPage;
