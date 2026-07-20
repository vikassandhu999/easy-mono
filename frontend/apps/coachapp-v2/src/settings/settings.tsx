/**
 * Settings — four tabs (Profile / Team / Billing / Account) rendered as a left
 * rail on desktop and a single scroll with underline tabs on mobile (ST refs).
 * Switching tabs unmounts the inactive panels, which is what cancels any inline
 * edit or invite in progress (INTERACTIONS.md § ST).
 */
import {getInitials} from '@easy/utils';
import {Avatar, Button, Tabs, Typography} from '@heroui/react';
import {ChevronRight, CreditCard, Globe, Shield, User, Users} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {clearTokens} from '@/api/authStorage';
import {coachApi} from '@/api/generated';
import {type CoachProfile, useGetCoachProfileQuery, useUpdateCoachProfileMutation} from '@/api/profile';
import {disconnectSocket} from '@/api/socket';
import BillingSection from '@/settings/billing';
import EditableRow from '@/settings/components/editable-row';
import {SettingsSectionHeader} from '@/settings/components/settings-section-header';
import TeamSection from '@/settings/team';
import {store} from '@/store';

const TABS = [
  {icon: User, id: 'profile', label: 'Profile'},
  {icon: Users, id: 'team', label: 'Team'},
  {icon: CreditCard, id: 'billing', label: 'Billing'},
  {icon: Shield, id: 'account', label: 'Account'},
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

const TAB_CLASS =
  'flex min-h-11 w-auto shrink-0 cursor-pointer items-center justify-start gap-2 whitespace-nowrap rounded-none border-0 border-b-2 border-b-transparent bg-transparent px-0 pb-2 text-sm font-medium text-muted shadow-none outline-none ' +
  'data-[selected=true]:border-b-ink data-[selected=true]:font-semibold data-[selected=true]:text-foreground ' +
  'md:w-full md:rounded-nav md:border-b-0 md:px-3 md:py-2.5 md:pb-2.5 md:text-foreground ' +
  'md:data-[selected=true]:bg-ink md:data-[selected=true]:text-ink-foreground';

const CARD_CLASS = 'overflow-hidden rounded-card border border-border bg-surface';

function ProfilePanel({
  onUpdate,
  profile,
}: {
  onUpdate: (
    body: Parameters<ReturnType<typeof useUpdateCoachProfileMutation>[0]>[0],
  ) => ReturnType<ReturnType<typeof useUpdateCoachProfileMutation>[0]>;
  profile: CoachProfile;
}) {
  const navigate = useNavigate();
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  const initials = getInitials(profile.first_name, profile.last_name);

  const handleNameSave = useCallback(
    async (value: string) => {
      const [firstName = '', ...lastName] = value.trim().split(/\s+/);
      await onUpdate({first_name: firstName, last_name: lastName.join(' ')}).unwrap();
    },
    [onUpdate],
  );

  const handleBusinessSave = useCallback(
    async (value: string) => {
      await onUpdate({business_name: value.trim()}).unwrap();
    },
    [onUpdate],
  );

  const handlePhoneSave = useCallback(
    async (value: string) => {
      await onUpdate({phone: value.trim()}).unwrap();
    },
    [onUpdate],
  );

  const handleWhatsappSave = useCallback(
    async (value: string) => {
      await onUpdate({whatsapp_number: value.trim()}).unwrap();
    },
    [onUpdate],
  );

  return (
    <div className="flex flex-col gap-2.5 md:gap-5">
      <SettingsSectionHeader
        description="Your name and how clients reach you"
        title="Profile"
      />

      <div className={CARD_CLASS}>
        <div className="flex items-center gap-3 p-4">
          <Avatar className="size-11 md:size-12">
            <Avatar.Fallback className="bg-accent text-base font-semibold text-accent-foreground">
              {initials}
            </Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <Typography weight="semibold">{name || 'No name'}</Typography>
            <Typography
              color="muted"
              type="body-sm"
            >
              {profile.business.name}
            </Typography>
          </div>
        </div>

        <EditableRow
          label="Name"
          onSave={handleNameSave}
          value={name}
        />
        <EditableRow
          label="Business"
          onSave={handleBusinessSave}
          value={profile.business.name}
        />
        <EditableRow
          inputType="tel"
          label="Phone"
          onSave={handlePhoneSave}
          value={profile.phone}
        />
        <EditableRow
          inputType="tel"
          label="WhatsApp"
          onSave={handleWhatsappSave}
          value={profile.business.whatsapp_number}
        />
      </div>

      {/* Kept from the pre-redesign screen: the landing-page editor has no home
          in the ST refs, but it is a live feature reachable only from here. */}
      <div className={CARD_CLASS}>
        <Button
          className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left"
          onPress={() => navigate(ROUTES.SETTINGS_LANDING_PAGE)}
          variant="ghost"
        >
          <Globe className="size-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <Typography type="body-sm">Landing page</Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              Your public page that turns visitors into prospects
            </Typography>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-2" />
        </Button>
      </div>
    </div>
  );
}

function AccountPanel({email, onLogout}: {email: string; onLogout: () => void}) {
  return (
    <div className="flex flex-col gap-2.5 md:gap-5">
      <SettingsSectionHeader
        description="Sign-in details"
        title="Account"
      />

      <div className={CARD_CLASS}>
        <div className="flex min-h-12 items-center gap-3 px-4 py-3">
          <Typography
            className="w-16 shrink-0 md:w-22"
            color="muted"
            type="body-sm"
          >
            Email
          </Typography>
          <Typography
            className="min-w-0 flex-1"
            truncate
            type="body-sm"
          >
            {email}
          </Typography>
        </div>
        <div className="flex min-h-12 items-center gap-3 border-t border-border px-4 py-3">
          <Typography
            className="w-16 shrink-0 md:w-22"
            color="muted"
            type="body-sm"
          >
            Auth
          </Typography>
          <Typography
            className="min-w-0 flex-1"
            type="body-sm"
          >
            Email OTP
          </Typography>
        </div>
      </div>

      <LogOutFooter
        className="hidden md:flex"
        onLogout={onLogout}
      />
    </div>
  );
}

function LogOutFooter({className, onLogout}: {className?: string; onLogout: () => void}) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <Button
        className="w-full rounded-xl border border-danger/30"
        onPress={onLogout}
        variant="danger-soft"
      >
        Log out
      </Button>
      <Typography
        align="center"
        color="muted"
        type="body-xs"
      >
        CoachApp v{__APP_VERSION__}
      </Typography>
    </div>
  );
}

function SettingsShell({
  children,
  onTabChange,
  tab,
}: {
  children: React.ReactNode;
  onTabChange: (tab: SettingsTab) => void;
  tab: SettingsTab;
}) {
  const isDesktop = useIsDesktop();

  return (
    <Tabs
      className="flex min-h-full flex-col md:flex-row md:items-stretch"
      onSelectionChange={(key) => onTabChange(key as SettingsTab)}
      orientation={isDesktop ? 'vertical' : 'horizontal'}
      selectedKey={tab}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-surface px-4 pt-3 md:static md:w-53 md:border-b-0 md:border-r md:bg-background md:px-3.5 md:pt-6">
        <Typography
          className="px-0 pb-2 font-grotesk md:px-2 md:pb-3.5"
          type="h3"
        >
          Settings
        </Typography>
        <Tabs.ListContainer className="scrollbar-hide -mx-4 max-w-full overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <Tabs.List className="flex w-max min-w-max gap-5 bg-transparent p-0 md:w-full md:min-w-0 md:flex-col md:gap-0.5">
            {TABS.map(({icon: Icon, id, label}) => (
              <Tabs.Tab
                className={TAB_CLASS}
                id={id}
                key={id}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </div>

      <div className="min-w-0 flex-1 px-4 pt-3.5 pb-6 md:px-8 md:pt-6 md:pb-10">
        <div className="md:mx-auto md:max-w-140">{children}</div>
      </div>
    </Tabs>
  );
}

const TAB_BY_PATH: Record<string, SettingsTab> = {[ROUTES.SETTINGS_BILLING]: 'billing'};

export default function Settings() {
  const {data, isError, isLoading, refetch} = useGetCoachProfileQuery();
  const [updateProfile] = useUpdateCoachProfileMutation();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  // Billing used to be its own page. It is now a tab, so `/settings/billing`
  // stays routable as a deep link: it opens the Billing tab and immediately
  // rewrites the URL to `/settings`, which is the canonical settings path.
  const [tab, setTab] = useState<SettingsTab>(() => TAB_BY_PATH[pathname] ?? 'profile');

  useEffect(() => {
    if (TAB_BY_PATH[pathname]) {
      navigate(ROUTES.SETTINGS, {replace: true});
    }
  }, [navigate, pathname]);

  const handleLogout = useCallback(() => {
    clearTokens();
    disconnectSocket();
    store.dispatch(coachApi.util.resetApiState());
    navigate('/login', {replace: true});
  }, [navigate]);

  if (isLoading) {
    return (
      <Page className="bg-background">
        <Page.Content>
          <Page.Frame
            className="pt-6 pb-6"
            size="form"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page className="bg-background">
        <Page.Content>
          <Page.Frame
            className="pt-6 pb-6"
            size="form"
          >
            <ErrorState message="Couldn't load settings." />
            <Button
              className="mt-3"
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const profile = data.data;

  return (
    <Page className="bg-background">
      <Page.Content>
        <SettingsShell
          onTabChange={setTab}
          tab={tab}
        >
          <Tabs.Panel id="profile">
            <ProfilePanel
              onUpdate={updateProfile}
              profile={profile}
            />
          </Tabs.Panel>
          <Tabs.Panel id="team">
            <TeamSection />
          </Tabs.Panel>
          <Tabs.Panel id="billing">
            <BillingSection />
          </Tabs.Panel>
          <Tabs.Panel id="account">
            <AccountPanel
              email={profile.email}
              onLogout={handleLogout}
            />
          </Tabs.Panel>

          <LogOutFooter
            className="mt-4 md:hidden"
            onLogout={handleLogout}
          />
        </SettingsShell>
      </Page.Content>
    </Page>
  );
}
