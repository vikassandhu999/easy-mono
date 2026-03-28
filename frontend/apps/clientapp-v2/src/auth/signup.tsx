import {Button, Input, Label, Link, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useSignupMutation} from '@/api/auth';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

type SignupFormValues = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const [signup, {isLoading}] = useSignupMutation();

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup({
        email: data.email,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
      }).unwrap();
      navigate(ROUTES.VERIFY_SIGNUP_OTP, {
        state: {email: data.email},
      });
    } catch (err) {
      applyFormErrors(err, 'Failed to create account. Please try again.', setError);
    }
  };

  return (
    <AuthLayout
      description="Create your account to get started."
      title="Create account"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input
              autoComplete="given-name"
              id="first_name"
              placeholder="Jane"
              {...register('first_name')}
            />
            {errors.first_name && <p className="text-xs text-danger">{errors.first_name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              autoComplete="family-name"
              id="last_name"
              placeholder="Doe"
              {...register('last_name')}
            />
            {errors.last_name && <p className="text-xs text-danger">{errors.last_name.message}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

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
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-500">
        Already have an account?{' '}
        <Link
          className="text-sm text-foreground underline"
          href={ROUTES.LOGIN}
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
