import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FolderOpen,
  Gift,
  LayoutDashboard,
  MessageSquareQuote,
  Settings,
  Store,
  UserCheck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {type ReactNode, useState} from 'react';
import {NavLink, Outlet, useLocation} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useListLeadsQuery} from '@/api/leads';

const ICON_SIZE = 20;

interface NavItem {
  badge?: ReactNode;
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

// Top-level sidebar items (non-grouped)
const SIDEBAR_TOP: NavItem[] = [
  {
    icon: <LayoutDashboard size={ICON_SIZE} />,
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
  },
  {
    icon: <Users size={ICON_SIZE} />,
    label: 'Clients',
    path: ROUTES.CLIENTS,
  },
  {
    badge: <LeadCountBadge />,
    icon: <UserCheck size={ICON_SIZE} />,
    label: 'Leads',
    path: ROUTES.LEADS,
  },
];

// Library group — collapsible on desktop sidebar
const LIBRARY_GROUP: NavGroup = {
  icon: <FolderOpen size={ICON_SIZE} />,
  items: [
    {
      icon: <Dumbbell size={ICON_SIZE} />,
      label: 'Exercises',
      path: ROUTES.EXERCISES,
    },
    {
      icon: <UtensilsCrossed size={ICON_SIZE} />,
      label: 'Foods',
      path: ROUTES.FOODS,
    },
    {
      icon: <BookOpen size={ICON_SIZE} />,
      label: 'Recipes',
      path: ROUTES.RECIPES,
    },
    {
      icon: <ClipboardList size={ICON_SIZE} />,
      label: 'Nutrition Plans',
      path: ROUTES.NUTRITION_PLANS,
    },
    {
      icon: <ClipboardList size={ICON_SIZE} />,
      label: 'Training Plans',
      path: ROUTES.TRAINING_PLANS,
    },
  ],
  label: 'Library',
  pathPrefix: ROUTES.LIBRARY,
};

// Storefront group — collapsible on desktop sidebar
const STOREFRONT_GROUP: NavGroup = {
  icon: <Store size={ICON_SIZE} />,
  items: [
    {
      icon: <Store size={ICON_SIZE} />,
      label: 'My Page',
      path: ROUTES.STOREFRONT_PAGE,
    },
    {
      icon: <Gift size={ICON_SIZE} />,
      label: 'Offers',
      path: ROUTES.STOREFRONT_OFFERS,
    },
    {
      icon: <MessageSquareQuote size={ICON_SIZE} />,
      label: 'Testimonials',
      path: ROUTES.STOREFRONT_TESTIMONIALS,
    },
  ],
  label: 'Storefront',
  pathPrefix: ROUTES.STOREFRONT,
};

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
    icon: <Users size={ICON_SIZE} />,
    label: 'Clients',
    path: ROUTES.CLIENTS,
  },
  {
    icon: <FolderOpen size={ICON_SIZE} />,
    label: 'Library',
    path: ROUTES.LIBRARY,
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
        `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
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

/** Small pill that shows the count of new leads. Hidden when 0. */
function LeadCountBadge() {
  const {data} = useListLeadsQuery({status: 'new', limit: 0});
  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white">
      {count > 99 ? '99+' : count}
    </span>
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
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
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
            <SidebarNavGroupSection group={STOREFRONT_GROUP} />
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
      <main className={`min-w-0 flex-1 lg:pb-0 lg:pl-64 ${showBottomNav ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — only on top-level pages */}
      {showBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-divider bg-background lg:hidden">
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
