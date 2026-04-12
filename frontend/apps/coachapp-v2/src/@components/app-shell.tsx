import {Button, Chip, Separator, Toast} from '@heroui/react';
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  Dumbbell,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {type ReactNode, useState} from 'react';
import {NavLink, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';

import {useInstallPrompt} from '@/@components/use-install-prompt';
import {ROUTES} from '@/@config/routes';
import {useListClientsQuery} from '@/api/clients';

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
    badge: <PendingClientBadge />,
    icon: <Users size={ICON_SIZE} />,
    label: 'Clients',
    path: ROUTES.CLIENTS,
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

// Storefront group — hidden for MVP, uncomment for v2 release
// const STOREFRONT_GROUP: NavGroup = {
//   icon: <Store size={ICON_SIZE} />,
//   items: [
//     {icon: <Store size={ICON_SIZE} />, label: 'My Page', path: ROUTES.STOREFRONT_PAGE},
//     {icon: <Gift size={ICON_SIZE} />, label: 'Offers', path: ROUTES.STOREFRONT_OFFERS},
//     {icon: <MessageSquareQuote size={ICON_SIZE} />, label: 'Testimonials', path: ROUTES.STOREFRONT_TESTIMONIALS},
//   ],
//   label: 'Storefront',
//   pathPrefix: ROUTES.STOREFRONT,
// };

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
        `relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 font-semibold text-primary before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-primary'
            : 'font-medium text-foreground-500 hover:bg-default-100 active:bg-default-200'
        }`
      }
      to={item.path}
      viewTransition
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge}
    </NavLink>
  );
}

/** Small pill showing count of pending (invited) clients. Hidden when 0. */
function PendingClientBadge() {
  const {data} = useListClientsQuery({status: 'pending', limit: 0});
  const count = data?.summary?.pending ?? 0;
  if (count === 0) return null;
  return (
    <Chip
      color="accent"
      size="sm"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}

function SidebarNavGroupSection({group}: {group: NavGroup}) {
  const location = useLocation();
  const isGroupActive = location.pathname.startsWith(group.pathPrefix);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
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
      {open ? (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-divider pl-3">
          {group.items.map((item) => (
            <NavLink
              className={({isActive}) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
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
      ) : null}
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
  const {canInstall, dismiss, promptInstall} = useInstallPrompt();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Global toast renderer — queued via toast() from @heroui/react */}
      <Toast.Provider placement="bottom end" />

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-divider bg-content1 lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 items-center px-6">
          <img
            alt="CoachEasy"
            className="h-7"
            src="/TextLogo.webp"
          />
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
            {/* Storefront hidden for MVP — uncomment for v2 release */}
            {/* <SidebarNavGroupSection group={STOREFRONT_GROUP} /> */}
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
          {/* Desktop install prompt */}
          {canInstall ? (
            <div className="mx-1 mt-3 rounded-lg border border-divider bg-content2 p-3">
              <p className="text-xs text-foreground-500">Install the app for quick access</p>
              <div className="mt-2 flex gap-2">
                <Button
                  className="flex-1"
                  onPress={promptInstall}
                  size="sm"
                >
                  <Download size={14} />
                  Install
                </Button>
                <Button
                  onPress={dismiss}
                  size="sm"
                  variant="ghost"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ) : null}
        </nav>
      </aside>

      {/* Main content — only add bottom padding when bottom nav is visible */}
      <main className={`min-w-0 flex-1 lg:pb-0 lg:pl-64 ${showBottomNav ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Scroll restoration — must be outside scrollable containers */}
      <ScrollRestoration />

      {/* Mobile install banner — above bottom nav */}
      {canInstall && showBottomNav ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-divider bg-content1 px-4 py-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-8 rounded-lg"
              src="/icons/icon-192x192.webp"
            />
            <p className="flex-1 text-xs text-foreground-500">Install CoachEasy for quick access</p>
            <Button
              onPress={promptInstall}
              size="sm"
            >
              Install
            </Button>
            <button
              className="flex min-h-11 min-w-11 items-center justify-center text-foreground-400"
              onClick={dismiss}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

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
