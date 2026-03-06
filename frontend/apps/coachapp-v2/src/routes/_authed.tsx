import {Button} from '@heroui/react';
import {createFileRoute, Link, Outlet, redirect, useLocation, useNavigate} from '@tanstack/react-router';
import {useEffect} from 'react';

import {NAV_ITEMS, UTILITY_ITEMS} from '@/app/layout/navConfig';
import {getAccessToken} from '@/entities/auth/api/auth';
import {AUTH_STORAGE_KEYS, clearTokens} from '@/entities/auth/model/authStorage';

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({location}) => {
    if (!getAccessToken()) {
      throw redirect({to: '/login', replace: true, state: {from: location.pathname}});
    }
  },
  component: AuthedLayout,
});

const MAIN_PAGE_PATHS = new Set(['/library', '/onboarding', '/page', '/settings']);

function AuthedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const showMobileNav = MAIN_PAGE_PATHS.has(pathname) || pathname.startsWith('/clients');

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEYS.accessToken && !event.newValue) {
        window.location.assign('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogout = () => {
    clearTokens();
    navigate({to: '/login'});
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar - hidden on mobile */}
      <nav
        aria-label="Main navigation"
        className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-separator md:bg-surface"
      >
        {/* App Logo/Identity */}
        <div className="flex h-16 items-center border-b border-separator px-6">
          <img
            alt="Coach Easy"
            className="h-8 w-auto"
            src="/logo.png"
          />
        </div>

        {/* Primary Navigation */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className="flex"
                key={item.path}
                to={item.path}
              >
                <Button
                  className="w-full justify-start gap-3 transition-none data-pressed:scale-100"
                  isDisabled={item.isDisabled}
                  size="lg"
                  variant={isActive ? 'secondary' : 'ghost'}
                >
                  <item.icon
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Utility Section */}
        <div className="flex flex-col gap-1 border-t border-separator p-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname === item.path;

            if (item.isLogout) {
              return (
                <Button
                  aria-label={item.label}
                  className="w-full justify-start gap-3 transition-none data-pressed:scale-100"
                  key={item.label}
                  onPress={handleLogout}
                  size="lg"
                  variant="outline"
                >
                  <item.icon
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  <span>{item.label}</span>
                </Button>
              );
            }

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className="flex"
                key={item.path}
                to={item.path}
              >
                <Button
                  className="w-full justify-start gap-3 transition-none data-pressed:scale-100"
                  isDisabled={item.isDisabled}
                  size="lg"
                  variant={isActive ? 'secondary' : 'ghost'}
                >
                  <item.icon
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 bg-background">
          <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-5 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {showMobileNav ? (
        <>
          <nav
            aria-label="Mobile navigation"
            className="fixed bottom-0 left-0 right-0 border-t border-separator bg-surface md:hidden"
          >
            <div className="flex items-center justify-around px-4 py-2 pb-safe">
              {NAV_ITEMS.filter((item) => item.showInMobile).map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    className="flex min-h-11 flex-col items-center justify-center"
                    key={item.path}
                    to={item.path}
                  >
                    <Button
                      className="transition-none data-pressed:scale-100"
                      isDisabled={item.isDisabled}
                      isIconOnly
                      size="lg"
                      variant={isActive ? 'secondary' : 'ghost'}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                    </Button>
                    <span className={`mt-1 text-xs ${isActive ? 'text-foreground' : 'text-muted'}`}>
                      {item.shortLabel || item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Safe bottom spacing for mobile to prevent content hiding behind nav */}
          <div className="h-20 md:hidden" />
        </>
      ) : null}
    </div>
  );
}
