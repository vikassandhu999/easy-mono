import {Button, Toast} from '@heroui/react';
import {ClipboardCheck, Dumbbell, MessageCircle, Settings, TrendingUp, UtensilsCrossed} from 'lucide-react';
import {type ReactNode} from 'react';
import {NavLink, Outlet, ScrollRestoration, useLocation} from 'react-router-dom';

import {AwaitingSeatScreen} from '@/@components/awaiting-seat-screen';
import SplashScreen from '@/@components/splash-screen';
import {ROUTES} from '@/@config/routes';
import {useGetClientConversationQuery} from '@/api/conversation';
import {useGetClientProfileQuery} from '@/api/profile';
import {useChatRealtime} from '@/messages/use-chat-realtime';

const ICON_SIZE = 22;

interface NavItem {
  badge?: ReactNode;
  icon: ReactNode;
  label: string;
  path: string;
}

function UnreadBadge() {
  const {data} = useGetClientConversationQuery();
  const count = data?.data.unread_count ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <span className="absolute right-1/2 top-1 grid min-w-4 -translate-x-2 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Mobile tab bar — the only nav. Client app is mobile-only (Capacitor); no desktop sidebar.
const BOTTOM_NAV: NavItem[] = [
  {icon: <Dumbbell size={ICON_SIZE} />, label: 'Training', path: ROUTES.TRAINING},
  {icon: <UtensilsCrossed size={ICON_SIZE} />, label: 'Nutrition', path: ROUTES.NUTRITION},
  {icon: <TrendingUp size={ICON_SIZE} />, label: 'Progress', path: ROUTES.PROGRESS},
  {icon: <ClipboardCheck size={ICON_SIZE} />, label: 'Check-ins', path: ROUTES.CHECKINS},
  {badge: <UnreadBadge />, icon: <MessageCircle size={ICON_SIZE} />, label: 'Coach', path: ROUTES.MESSAGES},
  {icon: <Settings size={ICON_SIZE} />, label: 'Settings', path: ROUTES.SETTINGS},
];

function BottomNavItem({item}: {item: NavItem}) {
  return (
    <NavLink
      className={({isActive}) =>
        `relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 text-[10px] ${
          isActive ? 'font-semibold text-accent' : 'font-medium text-muted active:text-foreground'
        }`
      }
      // `end` for root path so `/` doesn't match every nested route.
      end={item.path === '/'}
      to={item.path}
    >
      {({isActive}) => (
        <>
          {isActive ? <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent" /> : null}
          {item.icon}
          <span>{item.label}</span>
          {item.badge}
        </>
      )}
    </NavLink>
  );
}

// Paths that show the tab bar (top-level pages). Deep pages use their own back button.
const BOTTOM_NAV_PATHS = new Set(BOTTOM_NAV.map((item) => item.path));

// Routes that take over the entire screen (no tab bar). Prevents accidental
// navigation mid-workout — sweaty hands miss-tap easily.
const FULL_SCREEN_PATHS = new Set<string>([ROUTES.WORKOUT_ACTIVE]);

export default function AppShell() {
  const location = useLocation();
  const isFullScreen = FULL_SCREEN_PATHS.has(location.pathname);
  const showTabBar = !isFullScreen && BOTTOM_NAV_PATHS.has(location.pathname);
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useGetClientProfileQuery();

  useChatRealtime();

  // Block until we know the client's seat status — don't flash the blocked
  // screen (or the tab bar) before the profile query resolves.
  if (isProfileLoading) {
    return <SplashScreen />;
  }

  // Errored with no cached profile — don't fall through to the full app;
  // a genuinely awaiting_seat client on a flaky network must not see the shell.
  if (isProfileError && !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Couldn't load your profile</h1>
        <p className="text-sm text-muted">Check your connection and try again.</p>
        <Button
          className="mt-4"
          onPress={refetchProfile}
          size="sm"
          variant="ghost"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Coach hasn't activated a paid seat for this client yet: no plans,
  // logging, or workflows — blocks ALL shell routes.
  if (profile?.data.status === 'awaiting_seat') {
    return <AwaitingSeatScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global toast renderer — queued via toast() from @heroui/react */}
      <Toast.Provider placement="bottom end" />

      {/* Single centered phone-width column: full-width on device, framed in dev preview. */}
      <main className={`mx-auto w-full max-w-lg ${showTabBar ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}`}>
        <Outlet />
      </main>

      <ScrollRestoration />

      {/* Mobile tab bar — only on top-level pages */}
      {showTabBar ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-stretch justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-16 w-full items-stretch justify-around">
            {BOTTOM_NAV.map((item) => (
              <BottomNavItem
                item={item}
                key={item.path}
              />
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
