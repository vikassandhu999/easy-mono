import {humanizeError} from '@easy/error-parser';
import {Button, FieldError, Input, Label, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {Signup_zod, type SignupFormValues, type SignupRequest, useSignupMutation} from '@/services/auth';
import {notifyError} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [signup, {isLoading: isRegistering}] = useSignupMutation();

  const form = useForm<SignupFormValues>({
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
    },
    resolver: zodResolver(Signup_zod),
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      const request: SignupRequest = {
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
      };

      await signup(request).unwrap();

      const params = new URLSearchParams([['email', values.email]]);
      navigate('/register/verify?' + params.toString());
    } catch (err) {
      const errMsg = humanizeError(err);
      notifyError(errMsg);
    }
  };

  const isLoading = isRegistering || form.formState.isSubmitting;

  return (
    <AuthLayout
      subtitle="Let's get started."
      title="Create Account"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="first_name"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label className="text-md font-medium">First Name</Label>
              <Input placeholder="James" />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="last_name"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label className="text-md font-medium">Last Name</Label>
              <Input placeholder="Smith" />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </TextField>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label className="text-md font-medium">Email Address</Label>
              <Input placeholder="james@example.com" />
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

        <p className="text-center text-md text-muted">
          Already have an account?{' '}
          <button
            className="text-primary cursor-pointer bg-transparent border-none p-0"
            onClick={() => navigate('/login')}
            type="button"
          >
            Login
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
