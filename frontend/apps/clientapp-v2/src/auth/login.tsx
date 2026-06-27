import {Alert, Button, Input, Label, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useSendOtpMutation} from '@/api/auth';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type LoginFormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('session_expired') === 'true';
  // Prefer in-app navigation state (set by withAuth on protected route hit),
  // fall back to query param (set by base.ts on session expiry — survives hard reload).
  const stateRedirect = (location.state as null | {redirectTo?: string})?.redirectTo;
  const redirectTo = stateRedirect ?? searchParams.get('redirect_to') ?? undefined;
  const [sendOtp, {isLoading}] = useSendOtpMutation();

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await sendOtp({email: data.email, type: 'authentication'}).unwrap();
      navigate(ROUTES.VERIFY_LOGIN_OTP, {
        state: {email: data.email, redirectTo},
      });
    } catch (err) {
      applyFormErrors(err, 'Failed to send verification code. Please try again.', setError);
    }
  };

  return (
    <AuthLayout
      description="Enter your email and we'll send you a verification code."
      title="Welcome back"
    >
      {sessionExpired ? (
        <div className="mb-4">
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Your session has expired</Alert.Title>
              <Alert.Description>Please log in again to continue.</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>

        {errors.root ? <p className="text-sm text-danger">{errors.root.message}</p> : null}

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
              Sending code...
            </>
          ) : (
            'Continue with email'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">Your coach will send you an invitation link to get started.</p>
    </AuthLayout>
  );
}
