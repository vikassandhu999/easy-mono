import {humanizeError} from '@easy/error-parser';
import {Button, FieldError, Input, Label, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
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
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="email"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label className="text-md font-medium">Email address</Label>
              <Input
                placeholder="Enter your email"
                type="email"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        <Button
          className="w-full"
          isDisabled={isLoading}
          type="submit"
        >
          Continue
          <IconArrowRight size={20} />
        </Button>

        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-md text-muted">
            New to CoachEasy?{' '}
            <button
              className="text-primary cursor-pointer bg-transparent border-none p-0"
              onClick={() => navigate('/register')}
              type="button"
            >
              Create an account
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
