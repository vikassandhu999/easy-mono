import {Alert, Button, Input, Label, Link, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useDispatch} from 'react-redux';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {clearTokens, getAccessToken} from '@/api/authStorage';
import {api} from '@/api/base';
import {useShowTrainerInvitationQuery, useTrainerAcceptInviteMutation} from '@/api/generated';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

// ── Copy ─────────────────────────────────────────────────────
// Kept verbatim from the UX spec / handoff doc. Switching these is a copy
// change, not a behavioural one — leave strings alone unless the spec moves.

const INVITE_PHASE1_ERROR_MESSAGES: Record<string, string> = {
  invitation_expired: 'This invitation has expired. Ask the owner to send a new one.',
  invitation_invalid: 'This invitation is no longer valid. Contact the business owner.',
  invitation_used: 'This invitation has already been accepted. Log in to continue.',
};

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type AcceptInviteFormValues = z.infer<typeof schema>;

const KNOWN_FIELDS = ['email'] as const;

// ── Screen 1: Welcome / Invitation landing ───────────────────

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Capture `hasToken` into state on mount so a log-out inside the guard
  // flips this flag and re-renders the component down the pending-path tree.
  // (Reading `getAccessToken()` directly would be stable across renders,
  // since localStorage isn't a React data source.)
  const [hasToken, setHasToken] = useState(() => Boolean(getAccessToken()));

  // Token missing from the query string — render the generic "invalid" state
  // without an API call. Happens only if someone hand-crafts a bad URL.
  if (!token) {
    return <InvalidInvitation />;
  }

  // If a coach is already logged in and taps a different invite link, don't
  // silently swap accounts — require an explicit log-out first.
  if (hasToken) {
    return <AlreadyLoggedInGuard onLoggedOut={() => setHasToken(false)} />;
  }

  return <AcceptInviteWithToken token={token} />;
}

function AlreadyLoggedInGuard({onLoggedOut}: {onLoggedOut: () => void}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogOut = () => {
    // Clear persisted tokens + drop any cached authed data from RTK Query.
    // Without the cache reset, a subsequent authed query could return stale
    // data from the previous session before a fresh 401 triggers re-login.
    clearTokens();
    dispatch(api.util.resetApiState());
    onLoggedOut();
  };

  return (
    <AuthLayout
      description="You're currently logged in."
      title="Already logged in"
    >
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Log out first if you want to accept this invitation.</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          fullWidth
          onPress={handleLogOut}
          variant="danger"
        >
          Log out
        </Button>
        <Button
          fullWidth
          onPress={() => navigate(ROUTES.DASHBOARD, {replace: true})}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </AuthLayout>
  );
}

function AcceptInviteWithToken({token}: {token: string}) {
  // Skip cache on re-mount — invitation state can change between visits
  // (e.g. the owner revoked it, or it was already accepted elsewhere).
  const {data, error, isError, isFetching} = useShowTrainerInvitationQuery({token}, {refetchOnMountOrArgChange: true});

  if (isFetching) {
    // Minimal full-screen spinner while we look up the invitation — no
    // wrapping title/description because we don't know which state we're
    // about to render yet. Showing copy like "Loading..." would flash and
    // get replaced a moment later.
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner color="accent" />
      </div>
    );
  }

  if (isError) {
    const code = getApiErrorCode(error);
    if (code === 'invitation_used') {
      return <UsedInvitation />;
    }
    if (code === 'invitation_expired') {
      return <ExpiredInvitation />;
    }
    return <InvalidInvitation />;
  }

  if (!data) {
    return <InvalidInvitation />;
  }

  const preview = data.data;
  return (
    <WelcomeForm
      businessName={preview.business_name}
      prefillEmail={preview.email ?? null}
      token={token}
    />
  );
}

// ── Pending state: welcome + email form ──────────────────────

/**
 * Optional location state pushed by Screen 2's "Change it" back-link. Lets
 * us preserve the email the user typed (overriding the prefill) and focus
 * the field so they can correct it without tapping in.
 */
interface AcceptInviteLocationState {
  email?: string;
  focusEmail?: boolean;
}

function WelcomeForm({
  businessName,
  prefillEmail,
  token,
}: {
  businessName: string;
  prefillEmail: null | string;
  token: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [acceptInvite, {isLoading}] = useTrainerAcceptInviteMutation();

  // Priority: user-typed email (from Change-it) > coach prefill > empty.
  const locationState = location.state as AcceptInviteLocationState | null;
  const initialEmail = locationState?.email ?? prefillEmail ?? '';
  const shouldFocusEmail = locationState?.focusEmail ?? !prefillEmail;

  const {
    formState: {errors},
    handleSubmit,
    register,
    setError,
  } = useForm<AcceptInviteFormValues>({
    defaultValues: {email: initialEmail},
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: AcceptInviteFormValues) => {
    try {
      await acceptInvite({trainerAcceptInviteRequest: {invitation_token: token, email: data.email}}).unwrap();
      navigate(`${ROUTES.VERIFY_INVITE_OTP}?token=${encodeURIComponent(token)}`, {state: {email: data.email}});
    } catch (err) {
      const code = getApiErrorCode(err);

      // Invitation became invalid / used / expired between lookup and submit.
      // Re-render this route so the lookup query returns the new state and
      // shows the right copy. Navigate replace so Back doesn't return here.
      if (code && code in INVITE_PHASE1_ERROR_MESSAGES) {
        navigate(`${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}`, {replace: true});
        return;
      }

      applyFormErrors(err, 'Failed to send login code. Please try again.', setError, KNOWN_FIELDS);
    }
  };

  return (
    <AuthLayout
      description="You're invited as a trainer"
      title={`Join ${businessName} as a trainer`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">What&apos;s your email?</Label>
          <p className="text-xs text-muted">We&apos;ll send you a login code.</p>
          <Input
            autoComplete="email"
            autoFocus={shouldFocusEmail}
            id="email"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-danger-soft-foreground">{errors.email.message}</p> : null}
        </div>

        {errors.root ? <p className="text-sm text-danger-soft-foreground">{errors.root.message}</p> : null}

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
            'Continue'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

// ── Non-pending states ───────────────────────────────────────

function UsedInvitation() {
  const navigate = useNavigate();
  return (
    <AuthLayout
      description="This invitation has already been accepted."
      title="Already accepted"
    >
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Log in to continue.</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="mt-4">
        <Button
          fullWidth
          onPress={() => navigate(ROUTES.LOGIN)}
        >
          Log in
        </Button>
      </div>
    </AuthLayout>
  );
}

function ExpiredInvitation() {
  return (
    <AuthLayout
      description="This invitation has expired."
      title="Invitation expired"
    >
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Ask the business owner to send a new one.</Alert.Description>
        </Alert.Content>
      </Alert>
    </AuthLayout>
  );
}

function InvalidInvitation() {
  return (
    <AuthLayout
      description="This invitation is no longer valid."
      title="Invalid invitation"
    >
      <Alert status="default">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Contact the business owner.</Alert.Description>
        </Alert.Content>
      </Alert>
      <p className="mt-6 text-center text-sm text-muted">
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
