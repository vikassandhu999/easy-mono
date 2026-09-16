import {useEffect, useRef, useSyncExternalStore} from 'react';
import {useForm} from 'react-hook-form';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {useAcceptInvitation, useInvitation, type VerifyRequest} from '../api/auth';
import {errorMessage} from '../api/client';
import {clearSession, parseSession, sessionSnapshot, subscribeSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {getChallenge, saveChallenge} from './challenge';

export function Invitation() {
  const [params] = useSearchParams();
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  const token = params.get('token');
  if (!token) {
    return (
      <AuthLayout
        title="Invitation unavailable"
        description="This invitation link is incomplete. Ask the business owner to send another one."
      >
        <Link
          className="text-link"
          to={routes.login}
        >
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }
  if (session) {
    return (
      <AuthLayout
        title="You're signed in"
        description="Sign out before accepting an invitation for another account."
      >
        <div className="space-y-4">
          <Button
            className="w-full"
            onPress={clearSession}
          >
            Sign out to continue
          </Button>
          <Link
            className="text-link block text-center"
            to={routes.home}
          >
            Return to your account
          </Link>
        </div>
      </AuthLayout>
    );
  }
  return (
    <InvitationPreview
      key={token}
      token={token}
    />
  );
}

function InvitationPreview({token}: {token: string}) {
  const query = useInvitation(token);
  if (query.isPending) {
    return (
      <AuthLayout
        title="Your invitation"
        description="Checking the invitation details…"
      >
        <p
          role="status"
          className="animate-pulse text-muted-foreground"
        >
          Loading invitation…
        </p>
      </AuthLayout>
    );
  }
  if (query.isError) {
    return (
      <AuthLayout
        title="Invitation unavailable"
        description={errorMessage(query.error, 'We could not load this invitation. Please try again.')}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onPress={() => {
              query.refetch();
            }}
            isPending={query.isFetching}
          >
            Try again
          </Button>
          <Link
            className="text-link"
            to={routes.login}
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }
  return (
    <InvitationForm
      token={token}
      business={query.data.data.business_name}
      email={query.data.data.email ?? ''}
    />
  );
}

function InvitationForm({token, business, email}: {token: string; business: string; email: string}) {
  const mutation = useAcceptInvitation();
  const navigate = useNavigate();
  const challenge = getChallenge();
  const initialEmail = challenge?.kind === 'invite' && challenge.token === token ? challenge.email : email;
  const form = useForm<Pick<VerifyRequest, 'email'>>({defaultValues: {email: initialEmail}});
  const errorRef = useRef<HTMLParagraphElement>(null);
  const {errors, isSubmitting} = form.formState;
  useEffect(() => {
    if (errors.root && !isSubmitting) {
      errorRef.current?.focus();
    }
  }, [errors.root, isSubmitting]);
  const submit = form.handleSubmit(async ({email}) => {
    try {
      await mutation.mutateAsync({email, invitation_token: token});
      saveChallenge({kind: 'invite', email, token, sentAt: Date.now()});
      navigate(routes.verify);
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'We could not send your code. Please try again.')});
    }
  });
  return (
    <AuthLayout
      title={`Join ${business}`}
      description="You've been invited to join the coaching team. Verify your email to accept."
    >
      <form
        noValidate
        onSubmit={submit}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          isRequired
        />
        <FormError
          ref={errorRef}
          tabIndex={-1}
          message={errors.root?.message}
        />
        <SubmitButton pending={form.formState.isSubmitting}>Continue with email</SubmitButton>
      </form>
    </AuthLayout>
  );
}
