import {Button, ErrorMessage, Form, Link, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FormTextField} from '@/@components/form-fields';

import {ROUTES} from '@/@config/routes';
import {useSendOtpMutation} from '@/api/auth';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const schema = z.object({
  email: z.string().min(1, 'Enter email').email('Enter a valid email'),
});

type LoginFormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const [sendOtp, {isLoading}] = useSendOtpMutation();

  const form = useForm<LoginFormValues>({
    defaultValues: {email: ''},
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await sendOtp({email: data.email, type: 'authentication'}).unwrap();
      navigate(ROUTES.VERIFY_LOGIN_OTP, {
        state: {email: data.email},
      });
    } catch (err) {
      applyFormErrors(err, "Verification code wasn't sent. Try again", form.setError);
    }
  };

  return (
    <AuthLayout
      description="Enter your email and we'll send you a verification code."
      title="Welcome back"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormTextField
          control={form.control}
          fullWidth
          inputProps={{autoComplete: 'email'}}
          label="Email"
          name="email"
          type="email"
        />

        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

        <Button
          fullWidth
          isPending={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Sending code
            </>
          ) : (
            'Continue with email'
          )}
        </Button>
      </Form>

      <Typography
        className="mt-6 text-center"
        color="muted"
        type="body-sm"
      >
        Don&apos;t have an account?{' '}
        <Link
          className="text-sm text-foreground underline"
          href={ROUTES.SIGNUP}
        >
          Sign up
        </Link>
      </Typography>
    </AuthLayout>
  );
}
