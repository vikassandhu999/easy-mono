import {Button, Input, Label, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
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
        state: {email: data.email},
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

      <p className="mt-6 text-center text-sm text-foreground-500">
        Your coach will send you an invitation link to get started.
      </p>
    </AuthLayout>
  );
}
