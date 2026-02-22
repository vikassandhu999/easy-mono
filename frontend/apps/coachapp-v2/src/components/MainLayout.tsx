import {Button} from '@heroui/react';
import {NavLink, Outlet, useLocation} from 'react-router';

import {NAV_ITEMS} from './navConfig';

export default function MainLayout() {
  const location = useLocation();

  return (
    <>
      <Outlet />

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 border-t border-separator bg-surface md:hidden"
      >
        <div className="flex items-center justify-around px-4 py-2 pb-safe">
          {NAV_ITEMS.filter((item) => item.showInMobile).map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
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
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Safe bottom spacing for mobile to prevent content hiding behind nav */}
      <div className="h-20 md:hidden" />
    </>
  );
}
