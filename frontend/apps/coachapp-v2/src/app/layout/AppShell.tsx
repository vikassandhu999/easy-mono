import {Button} from '@heroui/react';
import {NavLink, Outlet, useLocation, useNavigate} from 'react-router';

import {clearTokens} from '@/entities/auth/model/authStorage';

import {NAV_ITEMS, UTILITY_ITEMS} from './navConfig';

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
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
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
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
              </NavLink>
            );
          })}
        </div>

        {/* Utility Section */}
        <div className="flex flex-col gap-1 border-t border-separator p-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;

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
              <NavLink
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
              </NavLink>
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
    </div>
  );
}
