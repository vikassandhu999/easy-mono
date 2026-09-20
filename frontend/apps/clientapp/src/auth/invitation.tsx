import {useSyncExternalStore} from 'react';
import {useForm} from 'react-hook-form';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useAcceptInvitation, useInvitation} from '../api/auth';
import {getChallenge, saveChallenge} from '../api/challenge';
import {errorMessage} from '../api/client';
import {clearSession, parseSession, sessionSnapshot, subscribeSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';

export function Invitation() {
  const {token} = useParams();
  const session = parseSession(useSyncExternalStore(subscribeSession, sessionSnapshot));
  if (!token) {
    return (
      <AuthLayout
        title="Invitation unavailable"
        description="This link is incomplete. Ask your coach to send another invitation."
      >
        <Link
          className="auth-primary-link"
          to={routes.login}
        >
          Sign in
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
        <Button
          className="w-full"
          onPress={clearSession}
        >
          Sign out to continue
        </Button>
        <Link
          className="text-link flex justify-center mt-5"
          to={routes.home}
        >
          Return to your account
        </Link>
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
        <p role="status">Loading invitation…</p>
      </AuthLayout>
    );
  }
  if (query.isError) {
    return (
      <AuthLayout
        title="Your invitation"
        description={errorMessage(
          query.error,
          'We could not load your invitation. Check your connection and try again.',
        )}
      >
        <Button
          className="w-full"
          onPress={() => {
            query.refetch();
          }}
          isPending={query.isFetching}
        >
          Try again
        </Button>
        <p className="mt-5 text-sm text-muted-foreground">
          If the link no longer works, ask your coach for a new invitation.
        </p>
        <Link
          className="text-link mt-3 flex justify-center"
          to={routes.login}
        >
          Sign in to an existing account
        </Link>
      </AuthLayout>
    );
  }
  const preview = query.data.data;
  if (preview.state !== 'pending') {
    return (
      <AuthLayout
        title={preview.state === 'used' ? 'Invitation accepted' : 'Invitation unavailable'}
        description={
          preview.state === 'used'
            ? 'Sign in to continue with your coach.'
            : 'This invitation has expired or is no longer valid. Ask your coach for another link.'
        }
      >
        <Link
          className="auth-primary-link"
          to={routes.login}
        >
          Sign in
        </Link>
      </AuthLayout>
    );
  }
  return (
    <InvitationForm
      token={token}
      business={preview.business_name ?? 'your coach'}
      email={preview.prefill_email ?? ''}
    />
  );
}

function InvitationForm({token, business, email}: {token: string; business: string; email: string}) {
  const mutation = useAcceptInvitation();
  const navigate = useNavigate();
  const challenge = getChallenge();
  const form = useForm<{email: string}>({
    defaultValues: {email: challenge?.kind === 'invite' && challenge.token === token ? challenge.email : email},
  });
  const submit = form.handleSubmit(async ({email}) => {
    try {
      await mutation.mutateAsync({email, invitation_token: token});
      await saveChallenge({kind: 'invite', email, token, sentAt: Date.now()});
      navigate(routes.verify);
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'We could not send your code. Please try again.')});
    }
  });
  return (
    <AuthLayout
      title={`Join ${business}`}
      description="Verify your email to accept your coach's invitation."
      artwork="welcome"
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
          isDisabled={form.formState.isSubmitting}
        />
        <FormError message={form.formState.errors.root?.message} />
        <SubmitButton pending={form.formState.isSubmitting}>Continue with email</SubmitButton>
      </form>
    </AuthLayout>
  );
}
