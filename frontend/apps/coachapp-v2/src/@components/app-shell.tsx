import {Button, Chip, CloseButton, Separator, Toast} from '@heroui/react';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  Dumbbell,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {type ReactNode, useState} from 'react';
import {NavLink, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';

import {useInstallPrompt} from '@/@components/use-install-prompt';
import {ROUTES} from '@/@config/routes';
import {useChannelEvent} from '@/@hooks/use-channel-event';
import {api} from '@/api/base';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useListProspectsQuery} from '@/api/prospects';
import {useAppDispatch} from '@/store';

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
  {
    badge: <NewProspectBadge />,
    icon: <Inbox size={ICON_SIZE} />,
    label: 'Prospects',
    path: ROUTES.PROSPECTS,
  },
  {
    badge: <UnreadMessagesBadge />,
    icon: <MessageCircle size={ICON_SIZE} />,
    label: 'Messages',
    path: ROUTES.MESSAGES,
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
    {
      icon: <ClipboardCheck size={ICON_SIZE} />,
      label: 'Check-ins',
      path: ROUTES.CHECKINS,
    },
  ],
  label: 'Library',
  pathPrefix: ROUTES.LIBRARY,
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
    icon: <Inbox size={ICON_SIZE} />,
    label: 'Prospects',
    path: ROUTES.PROSPECTS,
  },
  {
    badge: <UnreadMessagesBadge />,
    icon: <MessageCircle size={ICON_SIZE} />,
    label: 'Messages',
    path: ROUTES.MESSAGES,
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
        `relative flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-link font-semibold text-white'
            : 'font-medium text-accent-foreground/60 hover:bg-accent-foreground/10 hover:text-accent-foreground active:bg-accent-foreground/10'
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

function PendingClientBadge() {
  const {data} = useListClientsQuery({status: 'pending', limit: 0});
  const count = data?.summary?.pending ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <Chip
      color="accent"
      size="sm"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}

function NewProspectBadge() {
  const {data} = useListProspectsQuery({limit: 0});
  const count = data?.summary?.new ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <Chip
      color="accent"
      size="sm"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}

function UnreadMessagesBadge() {
  // ponytail: totals the first 100 conversations; matches the inbox page cap.
  const {data} = useListCoachConversationsQuery({limit: 100});
  const count = (data?.data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
  if (count === 0) {
    return null;
  }
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
      <Button
        className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-colors ${
          isGroupActive && !open
            ? 'bg-link font-semibold text-white'
            : 'font-medium text-accent-foreground/60 hover:bg-accent-foreground/10 hover:text-accent-foreground active:bg-accent-foreground/10'
        }`}
        fullWidth
        onPress={() => setOpen((prev) => !prev)}
        variant="ghost"
      >
        {group.icon}
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
      </Button>
      {open ? (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-accent-foreground/15 pl-3">
          {group.items.map((item) => (
            <NavLink
              className={({isActive}) =>
                `flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-link font-semibold text-white'
                    : 'font-medium text-accent-foreground/60 hover:bg-accent-foreground/10 hover:text-accent-foreground active:bg-accent-foreground/10'
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

function BottomNavItem({dark = false, item}: {dark?: boolean; item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[10px] ${
          dark
            ? isActive
              ? 'bg-accent-foreground/10 font-semibold text-link'
              : 'font-medium text-accent-foreground/55'
            : isActive
              ? 'bg-accent/10 font-semibold text-accent'
              : 'font-medium text-muted'
        }`
      }
      to={item.path}
    >
      {({isActive}) => (
        <>
          {isActive && <span className={`absolute top-0.5 h-1 w-5 rounded-full ${dark ? 'bg-link' : 'bg-accent'}`} />}
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
  const darkBottomNav = location.pathname === ROUTES.DASHBOARD;
  const {canInstall, dismiss, promptInstall} = useInstallPrompt();
  const dispatch = useAppDispatch();
  useChannelEvent('inbox', 'conversation_updated', () => {
    // Payload is id-only; refetch over HTTP where visibility is enforced.
    dispatch(api.util.invalidateTags([{type: 'Conversation', id: 'LIST'}]));
  });

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Global toast renderer — queued via toast() from @heroui/react */}
      <Toast.Provider placement="bottom end" />

      <aside className="hidden bg-accent text-accent-foreground/70 lg:fixed lg:inset-y-0 lg:flex lg:w-59 lg:flex-col">
        <div className="flex h-16 items-center px-6">
          <img
            alt="CoachEasy"
            className="h-7"
            src="/TextLogo.webp"
          />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="flex-1 space-y-1">
            {SIDEBAR_TOP.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.path}
              />
            ))}
            <SidebarNavGroupSection group={LIBRARY_GROUP} />
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
          {canInstall ? (
            <div className="mx-1 mt-3 rounded-lg border border-border bg-surface-secondary p-3">
              <p className="text-xs text-muted">Install the app for quick access</p>
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
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:pb-0 lg:pl-59 ${showBottomNav ? (canInstall ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]') : ''}`}
      >
        <Outlet />
      </main>

      {/* Scroll restoration — must be outside scrollable containers */}
      <ScrollRestoration />

      {/* Mobile install banner — above bottom nav */}
      {canInstall && showBottomNav ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface px-4 py-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-8 rounded-lg"
              src="/icons/icon-192x192.webp"
            />
            <p className="flex-1 text-xs text-muted">Install CoachEasy for quick access</p>
            <Button
              onPress={promptInstall}
              size="sm"
            >
              Install
            </Button>
            <CloseButton
              className="min-h-11 min-w-11 text-muted"
              onPress={dismiss}
            >
              <X size={16} />
            </CloseButton>
          </div>
        </div>
      ) : null}

      {/* Mobile bottom nav — only on top-level pages */}
      {showBottomNav ? (
        <nav
          className={`fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-center justify-around border-t pb-[env(safe-area-inset-bottom)] lg:hidden ${
            darkBottomNav ? 'border-accent bg-accent' : 'border-border bg-background'
          }`}
        >
          {BOTTOM_NAV.map((item) => (
            <BottomNavItem
              dark={darkBottomNav}
              item={item}
              key={item.path}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
