import {useProfile} from './api/auth';
import {errorMessage} from './api/client';
import {clearSession} from './api/session';
import {AuthLayout, FormError} from './auth/auth-layout';
import {Button} from './ui/button';

export function AppShell() {
  const profile = useProfile();
  if (profile.isPending) {
    return (
      <AuthLayout
        title="Your account"
        description="Opening your coaching account…"
      >
        <p
          role="status"
          className="animate-pulse text-muted-foreground"
        >
          Loading your details…
        </p>
      </AuthLayout>
    );
  }
  if (profile.isError) {
    return (
      <AuthLayout
        title="Your account"
        description="Your session is saved. We couldn't load your account details."
      >
        <div className="space-y-4">
          <FormError message={errorMessage(profile.error, 'Check your connection and try again.')} />
          <Button
            onPress={() => {
              profile.refetch();
            }}
            isPending={profile.isFetching}
          >
            Try again
          </Button>
          <Button
            variant="ghost"
            onPress={clearSession}
          >
            Sign out
          </Button>
        </div>
      </AuthLayout>
    );
  }
  const account = profile.data.data;
  return (
    <AuthLayout
      title="You're signed in"
      description={`Welcome to ${account.business.name}.`}
    >
      <div className="rounded-xl border border-border p-5">
        <p className="font-medium">
          {[account.first_name, account.last_name].filter(Boolean).join(' ') || 'Your account'}
        </p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{account.email}</p>
      </div>
      <Button
        variant="outline"
        className="mt-6 w-full"
        onPress={clearSession}
      >
        Sign out
      </Button>
    </AuthLayout>
  );
}
