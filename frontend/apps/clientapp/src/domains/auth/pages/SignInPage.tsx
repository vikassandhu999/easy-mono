import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, TextInput} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';
import React, {useCallback} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate, useNavigate} from 'react-router';

import AuthLayout from '@/domains/auth/layouts/AuthLayout';
import {useAuth} from '@/hooks/useAuthActions';
import {useSendLoginCodeMutation} from '@/services/auth';
import {SendLoginCode_zod, type SendLoginCodeRequest} from '@/services/auth/auth_definition';
import {notifyError, notifySuccess} from '@/utils/notification';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const {isAuthenticated} = useAuth();
  const [sendLoginCode, {isLoading}] = useSendLoginCodeMutation();

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<SendLoginCodeRequest>({
    resolver: zodResolver(SendLoginCode_zod),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = useCallback(
    async (values: SendLoginCodeRequest) => {
      try {
        const result = await sendLoginCode(values).unwrap();

        notifySuccess('Verification code sent to your email');

        // Navigate to code verification page with token_id and email
        const params = new URLSearchParams({
          token_id: result.token.token_id,
          email: values.email,
        });
        navigate(`/signin/code?${params.toString()}`);
      } catch (error) {
        notifyError(humanizeError(error));
      }
    },
    [sendLoginCode, navigate],
  );

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <AuthLayout
      q
      subtitle="Sign in to access your training schedule and coach."
      title="Welcome Back"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            error={errors.email?.message}
            label={
              <Text
                fw={500}
                size="md"
              >
                Email address
              </Text>
            }
            placeholder="Enter your email"
            size="lg"
            type="email"
            {...register('email')}
          />

          <Button
            fullWidth
            loaderProps={{type: 'bars'}}
            loading={isLoading}
            rightSection={<IconArrowRight size={18} />}
            size="lg"
            type="submit"
          >
            Continue
          </Button>

          <Stack
            align="center"
            gap="md"
          >
            <Text
              c="dimmed"
              fs="italic"
              size="xs"
              ta="center"
            >
              If you haven't yet joined, please ask your coach to send you the invitation link.
            </Text>
          </Stack>
        </Stack>
      </form>
    </AuthLayout>
  );
};

export default SignInPage;
