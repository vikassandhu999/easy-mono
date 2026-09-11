import {LogOut, UserRound} from 'lucide-react';
import {useEffect, useRef} from 'react';
import {Link, matchPath, NavLink, Outlet, useLocation} from 'react-router-dom';
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

export function AppShell() {
  const profile = useProfile();
  const {pathname} = useLocation();
  const main = useRef<HTMLElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Move keyboard focus on route changes; ScrollRestoration owns the reading position.
  useEffect(() => {
    main.current?.focus({preventScroll: true});
  }, [pathname]);
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
                    {`${account.first_name ?? ''} ${account.last_name ?? ''}`.trim() || 'Your account'}
                  </span>
                  <span className="mt-1 block break-all text-sm font-normal">{account.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onAction={clearSession}
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
      >
        <NavLink
          to={routes.home}
          end
          className={({isActive}) =>
            isActive || matchPath(routes.client, pathname) ? 'app-navigation-link active' : 'app-navigation-link'
          }
        >
          Clients
        </NavLink>
        <NavLink
          to={routes.forms}
          className={({isActive}) => (isActive ? 'app-navigation-link active' : 'app-navigation-link')}
        >
          Forms
        </NavLink>
        <NavLink
          to={routes.trainingPlans}
          className={({isActive}) => (isActive ? 'app-navigation-link active' : 'app-navigation-link')}
        >
          Training
        </NavLink>
        <NavLink
          to={routes.nutritionPlans}
          className={({isActive}) =>
            isActive || pathname.startsWith(routes.foods) || pathname.startsWith(routes.recipes)
              ? 'app-navigation-link active'
              : 'app-navigation-link'
          }
        >
          Nutrition
        </NavLink>
      </nav>
      <main
        id="main-content"
        ref={main}
        tabIndex={-1}
        className="app-main"
      >
        <Outlet />
      </main>
    </div>
  );
}
