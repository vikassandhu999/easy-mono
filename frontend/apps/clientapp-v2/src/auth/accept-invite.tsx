import {Button, Input, Label, Link, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useAcceptInviteMutation} from '@/api/auth';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'This invitation link is invalid or has already been used.',
  email_already_exists: 'An account with this email already exists. Try logging in instead.',
};

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type AcceptInviteFormValues = z.infer<typeof schema>;

export default function AcceptInvite() {
  const {token} = useParams<{token: string}>();
  const navigate = useNavigate();
  const [acceptInvite, {isLoading}] = useAcceptInviteMutation();

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(schema),
  });

  // Missing token in URL — invalid link
  if (!token) {
    return (
      <AuthLayout
        description="This invitation link is invalid."
        title="Invalid link"
      >
        <p className="text-center text-sm text-foreground-500">Please check the link from your coach and try again.</p>
        <p className="mt-4 text-center">
          <Link
            className="text-sm text-foreground underline"
            href={ROUTES.LOGIN}
          >
            Go to login
          </Link>
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: AcceptInviteFormValues) => {
    try {
      const result = await acceptInvite({
        invitation_token: token,
        email: data.email,
      }).unwrap();

      if (result.email_confirmed) {
        // Email already verified (existing account) — go straight to login
        navigate(ROUTES.LOGIN, {state: {email: data.email}});
      } else {
        // New account — needs email verification via OTP
        navigate(ROUTES.VERIFY_EMAIL, {state: {email: data.email}});
      }
    } catch (err) {
      const code = getApiErrorCode(err);
      const fallback = INVITE_ERROR_MESSAGES[code ?? ''] ?? 'Failed to accept invitation. Please try again.';
      applyFormErrors(err, fallback, setError);
    }
  };

  return (
    <AuthLayout
      description="Your coach has invited you to join their platform. Enter an email to create your account."
      title="Welcome to CoachEasy!"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email (for login)</Label>
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
              Accepting...
            </>
          ) : (
            'Accept Invitation'
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
