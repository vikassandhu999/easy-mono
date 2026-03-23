import {useState} from 'react';
import {NavLink, Outlet, useLocation} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';

interface NavItem {
  icon: JSX.Element;
  label: string;
  path: string;
}

interface NavGroup {
  icon: JSX.Element;
  items: NavItem[];
  label: string;
  pathPrefix: string;
}

// SVG icons — inline to avoid extra dependencies
function DashboardIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DumbbellIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M6.75 7.5h10.5M6.75 16.5h10.5M3.75 12h16.5M5.25 7.5v9M18.75 7.5v9M3.75 9.75v4.5M20.25 9.75v4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FoodIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClipboardIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecipeIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({className, open}: {className?: string; open: boolean}) {
  return (
    <svg
      className={`${className} transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Top-level sidebar items (non-grouped)
const SIDEBAR_TOP: NavItem[] = [
  {
    icon: <DashboardIcon className="h-5 w-5" />,
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
  },
  {
    icon: <UsersIcon className="h-5 w-5" />,
    label: 'Clients',
    path: ROUTES.CLIENTS,
  },
];

// Library group — collapsible on desktop sidebar
const LIBRARY_GROUP: NavGroup = {
  icon: <LibraryIcon className="h-5 w-5" />,
  items: [
    {
      icon: <DumbbellIcon className="h-5 w-5" />,
      label: 'Exercises',
      path: ROUTES.EXERCISES,
    },
    {
      icon: <FoodIcon className="h-5 w-5" />,
      label: 'Foods',
      path: ROUTES.FOODS,
    },
    {
      icon: <RecipeIcon className="h-5 w-5" />,
      label: 'Recipes',
      path: ROUTES.RECIPES,
    },
    {
      icon: <ClipboardIcon className="h-5 w-5" />,
      label: 'Nutrition Plans',
      path: ROUTES.NUTRITION_PLANS,
    },
    {
      icon: <ClipboardIcon className="h-5 w-5" />,
      label: 'Training Plans',
      path: ROUTES.TRAINING_PLANS,
    },
  ],
  label: 'Library',
  pathPrefix: ROUTES.LIBRARY,
};

// Bottom sidebar items
const SIDEBAR_BOTTOM: NavItem[] = [
  {
    icon: <GearIcon className="h-5 w-5" />,
    label: 'Settings',
    path: ROUTES.SETTINGS,
  },
];

// Mobile bottom nav — max 5 most-used items (thumb-friendly)
const BOTTOM_NAV: NavItem[] = [
  {
    icon: <DashboardIcon className="h-5 w-5" />,
    label: 'Home',
    path: ROUTES.DASHBOARD,
  },
  {
    icon: <UsersIcon className="h-5 w-5" />,
    label: 'Clients',
    path: ROUTES.CLIENTS,
  },
  {
    icon: <LibraryIcon className="h-5 w-5" />,
    label: 'Library',
    path: ROUTES.LIBRARY,
  },
  {
    icon: <GearIcon className="h-5 w-5" />,
    label: 'Settings',
    path: ROUTES.SETTINGS,
  },
];

function SidebarNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-primary'
            : 'font-medium text-foreground-500 hover:bg-default-100 active:bg-default-200'
        }`
      }
      to={item.path}
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

function SidebarNavGroupSection({group}: {group: NavGroup}) {
  const location = useLocation();
  const isGroupActive = location.pathname.startsWith(group.pathPrefix);
  const [open, setOpen] = useState(isGroupActive);

  return (
    <div>
      <button
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isGroupActive && !open
            ? 'bg-primary/10 font-semibold text-primary'
            : 'font-medium text-foreground-500 hover:bg-default-100 active:bg-default-200'
        }`}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {group.icon}
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronIcon
          className="h-4 w-4"
          open={open}
        />
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-divider pl-3">
          {group.items.map((item) => (
            <NavLink
              className={({isActive}) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'font-medium text-foreground-500 hover:bg-default-100 active:bg-default-200'
                }`
              }
              key={item.path}
              to={item.path}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
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
          {isActive && <span className="absolute top-0.5 h-1 w-5 rounded-full bg-primary" />}
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
          <span className="text-lg font-semibold">CoachApp</span>
        </div>
        <nav className="flex flex-1 flex-col px-3 py-4">
          <div className="flex-1 space-y-1">
            {SIDEBAR_TOP.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.path}
              />
            ))}
            <SidebarNavGroupSection group={LIBRARY_GROUP} />
          </div>
          <div className="space-y-1 border-t border-divider pt-4">
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
      <main className={`flex-1 lg:pb-0 lg:pl-64 ${showBottomNav ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — only on top-level pages */}
      {showBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-divider bg-content1 lg:hidden">
          {BOTTOM_NAV.map((item) => (
            <BottomNavItem
              item={item}
              key={item.path}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
