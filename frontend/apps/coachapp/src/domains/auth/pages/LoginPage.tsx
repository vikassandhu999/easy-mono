import {humanizeError} from '@easy/error-parser';
import {TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, TextInput} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {SendLoginCode_zod, SendLoginCodeRequest, useSendLoginCodeMutation} from '@/services/auth';
import {notifyError} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [sendOTP, {isLoading: reqLoading}] = useSendLoginCodeMutation();

  const form = useForm<SendLoginCodeRequest>({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(SendLoginCode_zod),
    mode: 'onBlur',
  });

  const onSubmit = async (values: SendLoginCodeRequest) => {
    try {
      const response = await sendOTP(values).unwrap();

      const params = new URLSearchParams([
        ['token_id', response.token.token_id],
        ['email', response.user.email],
      ]);

      navigate('/login/verify?' + params.toString());
    } catch (err) {
      const errMsg = humanizeError(err);

      notifyError(errMsg);
    }
  };

  const isLoading = reqLoading || form.formState.isSubmitting;

  return (
    <AuthLayout
      subtitle="Login to manage your coaching business"
      title="Welcome Back"
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextField
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
            {...form.register('email')}
            error={form.formState?.errors?.email?.message}
          />

          <Button
            disabled={isLoading}
            fullWidth
            loaderProps={{
              type: 'bars',
            }}
            loading={isLoading}
            rightSection={<IconArrowRight />}
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
              size="md"
              ta="center"
            >
              New to CoachEasy?{' '}
              <Text
                c="blue"
                onClick={() => navigate('/register')}
                span={true}
                style={{cursor: 'pointer'}}
              >
                Create an account
              </Text>
            </Text>
          </Stack>
        </Stack>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
