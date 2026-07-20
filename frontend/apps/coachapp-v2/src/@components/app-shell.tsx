import {getInitials} from '@easy/utils';
import {Button, Chip, CloseButton, Toast} from '@heroui/react';
import {
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  Salad,
  Settings,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {NavLink, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';

import {useInstallPrompt} from '@/@components/use-install-prompt';
import {ROUTES} from '@/@config/routes';
import {useChannelEvent} from '@/@hooks/use-channel-event';
import {api} from '@/api/base';
import {useListClientsQuery} from '@/api/clients';
import {useListCoachConversationsQuery} from '@/api/conversations';
import {useGetCoachProfileQuery} from '@/api/profile';
import {useAppDispatch} from '@/store';

const ICON = 18;

interface NavItem {
  badge?: ReactNode;
  icon: JSX.Element;
  label: string;
  path: string;
}

const PRIMARY: NavItem[] = [
  {icon: <LayoutDashboard size={ICON} />, label: 'Dashboard', path: ROUTES.DASHBOARD},
  {badge: <ClientCountBadge />, icon: <Users size={ICON} />, label: 'Clients', path: ROUTES.CLIENTS},
  {badge: <UnreadBadge />, icon: <MessageCircle size={ICON} />, label: 'Messages', path: ROUTES.MESSAGES},
];

const BUILDER: NavItem[] = [
  {icon: <Dumbbell size={ICON} />, label: 'Exercises', path: ROUTES.EXERCISES},
  {icon: <UtensilsCrossed size={ICON} />, label: 'Foods', path: ROUTES.FOODS},
  {icon: <ChefHat size={ICON} />, label: 'Recipes', path: ROUTES.RECIPES},
  {icon: <Salad size={ICON} />, label: 'Nutrition', path: ROUTES.NUTRITION_PLANS},
  {icon: <ClipboardList size={ICON} />, label: 'Training', path: ROUTES.TRAINING_PLANS},
  {icon: <ClipboardCheck size={ICON} />, label: 'Forms', path: ROUTES.CHECKINS},
];

// Mobile bottom tab bar — Builder maps to the library landing.
const BOTTOM_NAV: NavItem[] = [
  {icon: <LayoutDashboard size={21} />, label: 'Dashboard', path: ROUTES.DASHBOARD},
  {icon: <Users size={21} />, label: 'Clients', path: ROUTES.CLIENTS},
  {icon: <LayoutGrid size={21} />, label: 'Builder', path: ROUTES.LIBRARY},
  {badge: <UnreadBadge />, icon: <MessageCircle size={21} />, label: 'Messages', path: ROUTES.MESSAGES},
];

function SidebarLink({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-accent font-semibold text-accent-foreground'
            : 'font-medium text-white/80 hover:bg-white/10 hover:text-white'
        }`
      }
      to={item.path}
    >
      <span className="[&_svg]:opacity-70">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge}
    </NavLink>
  );
}

function ClientCountBadge() {
  const {data} = useListClientsQuery({limit: 0});
  const count = data?.summary?.active ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <Chip
      color="default"
      size="sm"
      variant="soft"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}

function UnreadBadge() {
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
      variant="primary"
    >
      {count > 99 ? '99+' : count}
    </Chip>
  );
}

function ProfileCard() {
  const {data} = useGetCoachProfileQuery();
  const profile = data?.data;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your profile';
  const initials = getInitials(profile?.first_name, profile?.last_name) || '?';

  return (
    <NavLink
      className="mx-0.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] p-2 transition-colors hover:border-white/20 hover:bg-white/[0.11]"
      to={ROUTES.SETTINGS}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-xs font-semibold text-warning-soft-foreground">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{name}</span>
        <span className="block truncate text-chip text-white/50">{profile?.business.name ?? ''}</span>
      </span>
      <Settings
        className="shrink-0 text-white/50"
        size={16}
      />
    </NavLink>
  );
}

function BottomNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 text-chip transition-colors ${
          isActive ? 'font-semibold text-accent' : 'font-medium text-white/55'
        }`
      }
      to={item.path}
    >
      <span className="relative">
        {item.icon}
        {item.badge ? <span className="absolute -right-2.5 -top-1.5">{item.badge}</span> : null}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

// Top-level destinations keep the mobile bottom navigation. Detail, edit, and
// builder routes remain focused pages without app-shell chrome.
const MOBILE_FRAME_PATHS = new Set([
  ...BOTTOM_NAV.map((item) => item.path),
  ...BUILDER.map((item) => item.path),
  ROUTES.SETTINGS,
]);

export default function AppShell() {
  const location = useLocation();
  const showMobileFrame = MOBILE_FRAME_PATHS.has(location.pathname);
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

      <aside className="hidden bg-[var(--ink)] lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:p-3">
        <div className="mx-0.5 flex items-center gap-2.5 border-b border-white/10 px-1.5 pb-3.5 pt-0.5">
          <span className="flex size-8 items-center justify-center rounded-control bg-accent font-grotesk text-base font-bold text-accent-foreground">
            C
          </span>
          <span className="font-grotesk text-lg font-bold text-white">
            Coach<span className="text-accent">Easy</span>
          </span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4">
          <div className="flex flex-col gap-0.5">
            {PRIMARY.map((item) => (
              <SidebarLink
                item={item}
                key={item.path}
              />
            ))}
          </div>
          <div className="px-2 pb-1.5 pt-4 text-chip font-semibold uppercase tracking-wider text-white/40">Builder</div>
          <div className="flex flex-col gap-0.5">
            {BUILDER.map((item) => (
              <SidebarLink
                item={item}
                key={item.path}
              />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-4">
            {canInstall ? (
              <div className="mx-0.5 rounded-xl border border-white/10 bg-white/[0.07] p-3">
                <p className="text-xs text-white/70">Install the app for quick access</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    className="min-h-11 flex-1"
                    onPress={promptInstall}
                    size="sm"
                  >
                    Install
                  </Button>
                  <Button
                    aria-label="Dismiss install prompt"
                    className="min-h-11 min-w-11 text-white/70"
                    onPress={dismiss}
                    size="sm"
                    variant="ghost"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : null}
            <ProfileCard />
          </div>
        </nav>
      </aside>

      {/* Main content — only add bottom padding when bottom nav is visible */}
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:pb-0 lg:pl-60 ${showMobileFrame ? (canInstall ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]') : ''}`}
      >
        <Outlet />
      </main>

      {/* Scroll restoration — must be outside scrollable containers */}
      <ScrollRestoration />

      {/* Mobile install banner — above bottom nav */}
      {canInstall && showMobileFrame ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface px-4 py-2.5 lg:hidden">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-8 rounded-lg"
              src="/icons/icon-192x192.webp"
            />
            <p className="flex-1 text-xs text-muted">Install CoachEasy for quick access</p>
            <Button
              className="min-h-11"
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
      {showMobileFrame ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 bg-[var(--ink)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5 lg:hidden">
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
