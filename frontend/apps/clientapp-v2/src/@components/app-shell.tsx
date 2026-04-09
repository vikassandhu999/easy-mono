import {Separator} from '@heroui/react';
import {Dumbbell, History, LayoutDashboard, Settings, UtensilsCrossed} from 'lucide-react';
import {type ReactNode} from 'react';
import {NavLink, Outlet, useLocation} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

const ICON_SIZE = 20;

interface NavItem {
  badge?: ReactNode;
  icon: ReactNode;
  label: string;
  path: string;
}

// Top-level sidebar items
const SIDEBAR_TOP: NavItem[] = [
  {
    icon: <LayoutDashboard size={ICON_SIZE} />,
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
  },
  {
    icon: <UtensilsCrossed size={ICON_SIZE} />,
    label: 'Nutrition',
    path: ROUTES.NUTRITION,
  },
  {
    icon: <Dumbbell size={ICON_SIZE} />,
    label: 'Workout',
    path: ROUTES.WORKOUT_ACTIVE,
  },
  {
    icon: <History size={ICON_SIZE} />,
    label: 'History',
    path: ROUTES.WORKOUT_HISTORY,
  },
];

// Bottom sidebar items
const SIDEBAR_BOTTOM: NavItem[] = [
  {
    icon: <Settings size={ICON_SIZE} />,
    label: 'Settings',
    path: ROUTES.SETTINGS,
  },
];

// Mobile bottom nav — max 5 most-used items (thumb-friendly)
const BOTTOM_NAV: NavItem[] = [
  {
    icon: <LayoutDashboard size={ICON_SIZE} />,
    label: 'Home',
    path: ROUTES.DASHBOARD,
  },
  {
    icon: <UtensilsCrossed size={ICON_SIZE} />,
    label: 'Nutrition',
    path: ROUTES.NUTRITION,
  },
  {
    icon: <Dumbbell size={ICON_SIZE} />,
    label: 'Workout',
    path: ROUTES.WORKOUT_ACTIVE,
  },
  {
    icon: <History size={ICON_SIZE} />,
    label: 'History',
    path: ROUTES.WORKOUT_HISTORY,
  },
  {
    icon: <Settings size={ICON_SIZE} />,
    label: 'Settings',
    path: ROUTES.SETTINGS,
  },
];

function SidebarNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-primary'
            : 'font-medium text-foreground-500 hover:bg-default-100 active:bg-default-200'
        }`
      }
      to={item.path}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge}
    </NavLink>
  );
}

function BottomNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[10px] ${
          isActive ? 'bg-primary/10 font-semibold text-primary' : 'font-medium text-foreground-400'
        }`
      }
      to={item.path}
    >
      {({isActive}) => (
        <>
          {isActive ? <span className="absolute top-0.5 h-1 w-5 rounded-full bg-primary" /> : null}
          <span className={isActive ? 'mt-1' : ''}>{item.icon}</span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

// Paths where the mobile bottom nav is visible (exact match only)
const BOTTOM_NAV_PATHS = new Set(BOTTOM_NAV.map((item) => item.path));

export default function AppShell() {
  const location = useLocation();
  const showBottomNav = BOTTOM_NAV_PATHS.has(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-divider bg-content1 lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 items-center px-6">
          <img alt="CoachEasy" className="h-7" src="/TextLogo.webp" />
        </div>
        <nav className="flex flex-1 flex-col px-3 py-4">
          <div className="flex-1 space-y-1">
            {SIDEBAR_TOP.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.path}
              />
            ))}
          </div>
          <Separator className="my-2" />
          <div className="space-y-1 pt-2">
            {SIDEBAR_BOTTOM.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.path}
              />
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content — only add bottom padding when bottom nav is visible */}
      <main className={`min-w-0 flex-1 lg:pb-0 lg:pl-64 ${showBottomNav ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — only on top-level pages */}
      {showBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-divider bg-background lg:hidden">
          {BOTTOM_NAV.map((item) => (
            <BottomNavItem
              item={item}
              key={item.path}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
