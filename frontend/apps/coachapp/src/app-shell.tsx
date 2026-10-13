import {Building2, Compass, CreditCard, LogOut, UserRound, UsersRound} from 'lucide-react';
import {useEffect, useRef} from 'react';
import {flushSync} from 'react-dom';
import {Link, matchPath, NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {useProfile} from './api/auth';
import {errorMessage} from './api/client';
import {clearSession} from './api/session';
import {AuthLayout, FormError} from './auth/auth-layout';
import {routes} from './routes';
import {Button} from './ui/button';
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {useTaskReturn} from './ui/list-location';

export function AppShell() {
  const profile = useProfile();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const taskReturn = useTaskReturn();
  const main = useRef<HTMLElement>(null);
  const accountReady = Boolean(profile.data);
  const signOut = () => {
    // Unmount the old session's draft blockers before starting a fresh sign-in.
    flushSync(clearSession);
    navigate(routes.login, {replace: true, flushSync: true});
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Focus when the route or its loaded account becomes available; preserve focus on background refreshes.
  useEffect(() => {
    main.current?.focus({preventScroll: true});
  }, [pathname, accountReady]);
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
  if (!profile.data) {
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
            onPress={signOut}
          >
            Sign out
          </Button>
        </div>
      </AuthLayout>
    );
  }
  const account = profile.data.data;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-content">
          <Link
            to={routes.home}
            className="app-brand"
            aria-label="Easy clients"
          >
            easy<span className="sr-only"> Coach</span>
          </Link>
          <p
            className="app-business"
            title={account.business.name}
          >
            {account.business.name}
          </p>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Your account"
            >
              <UserRound aria-hidden="true" />
            </Button>
            <DropdownMenu
              aria-label="Your account"
              placement="bottom end"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block break-words text-sm font-semibold text-foreground">
                    {account.preferred_name || account.full_name || 'Your account'}
                  </span>
                  <span className="mt-1 block break-all text-sm font-normal">{account.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onAction={() => navigate(routes.profileSettings)}
                  textValue="Your profile"
                >
                  <UserRound aria-hidden="true" />
                  Your profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onAction={() => navigate(routes.businessSettings)}
                  textValue="Business settings"
                >
                  <Building2 aria-hidden="true" />
                  Business settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onAction={() => navigate(routes.billing)}
                  textValue="Billing"
                >
                  <CreditCard aria-hidden="true" />
                  Billing
                </DropdownMenuItem>
                {account.is_owner && (
                  <DropdownMenuItem
                    onAction={() => navigate(routes.team)}
                    textValue="Team"
                  >
                    <UsersRound aria-hidden="true" />
                    Team
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onAction={() => navigate(routes.welcome)}
                  textValue="Explore Easy"
                >
                  <Compass aria-hidden="true" />
                  Explore Easy
                </DropdownMenuItem>
                <DropdownMenuItem
                  onAction={signOut}
                  textValue="Sign out"
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </div>
      </header>
      <nav
        aria-label="Coaching"
        className="app-navigation"
        onFocusCapture={(event) => event.target.scrollIntoView({block: 'nearest', inline: 'nearest'})}
      >
        <NavLink
          to={routes.home}
          end
          className={({isActive}) =>
            isActive ||
            (matchPath({path: routes.client, end: false}, pathname) && !matchPath(routes.clientConversation, pathname))
              ? 'app-navigation-link active'
              : 'app-navigation-link'
          }
        >
          Clients
        </NavLink>
        <NavLink
          to={routes.conversations}
          className={({isActive}) =>
            isActive || matchPath(routes.clientConversation, pathname)
              ? 'app-navigation-link active'
              : 'app-navigation-link'
          }
        >
          Messages
        </NavLink>
        <NavLink
          to={routes.workouts}
          className={({isActive}) =>
            isActive || pathname.startsWith(routes.exercises) ? 'app-navigation-link active' : 'app-navigation-link'
          }
        >
          Workouts
        </NavLink>
        <NavLink
          to={routes.foods}
          className={({isActive}) => (isActive ? 'app-navigation-link active' : 'app-navigation-link')}
        >
          Foods
        </NavLink>
        <NavLink
          to={routes.trackers}
          className={({isActive}) =>
            isActive || pathname.startsWith(routes.trackerTemplates)
              ? 'app-navigation-link active'
              : 'app-navigation-link'
          }
        >
          Trackers
        </NavLink>
      </nav>
      <main
        id="main-content"
        ref={main}
        tabIndex={-1}
        className={
          matchPath(routes.clientNutrition, pathname) || matchPath(routes.clientTraining, pathname)
            ? 'app-main app-main-wide'
            : 'app-main'
        }
      >
        {profile.isError && (
          <div className="mb-6 space-y-3">
            <FormError message="Could not refresh your account details. Your work is still here." />
            <Button
              variant="outline"
              isPending={profile.isFetching}
              onPress={() => {
                profile.refetch();
              }}
            >
              Retry account details
            </Button>
          </div>
        )}
        {taskReturn && taskReturn.to !== pathname && (
          <Link
            to={taskReturn.to}
            state={taskReturn.state}
            className="page-back mb-6"
          >
            {taskReturn.label}
          </Link>
        )}
        <Outlet />
      </main>
    </div>
  );
}
