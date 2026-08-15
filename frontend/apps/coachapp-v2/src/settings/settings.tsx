/**
 * Settings — four tabs (Profile / Team / Billing / Account) rendered as a left
 * rail on desktop and a single scroll with underline tabs on mobile (ST refs).
 * Switching tabs unmounts the inactive panels, which is what cancels any inline
 * edit or invite in progress (INTERACTIONS.md § ST).
 */
import {getInitials} from '@easy/utils';
import {Avatar, Button, Tabs, Typography} from '@heroui/react';
import {CreditCard, Shield, User, Users} from 'lucide-react';
import {useCallback} from 'react';
import {generatePath, useNavigate, useParams} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {clearTokens} from '@/api/authStorage';
import {type CoachProfile, useGetCoachProfileQuery, useUpdateCoachProfileMutation} from '@/api/profile';
import {queryClient} from '@/api/query-client';
import {disconnectSocket} from '@/api/socket';
import BillingSection from '@/settings/billing';
import EditableRow from '@/settings/components/editable-row';
import {SettingsSectionHeader} from '@/settings/components/settings-section-header';
import TeamSection from '@/settings/team';

const TABS = [
  {icon: User, id: 'profile', label: 'Profile'},
  {icon: Users, id: 'team', label: 'Team'},
  {icon: CreditCard, id: 'billing', label: 'Billing'},
  {icon: Shield, id: 'account', label: 'Account'},
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

const CARD_CLASS = 'overflow-hidden rounded-card border border-border bg-surface';

function ProfilePanel({
  onUpdate,
  profile,
}: {
  onUpdate: ReturnType<typeof useUpdateCoachProfileMutation>['mutateAsync'];
  profile: CoachProfile;
}) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  const initials = getInitials(profile.first_name, profile.last_name);

  const handleNameSave = useCallback(
    async (value: string) => {
      const [firstName = '', ...lastName] = value.trim().split(/\s+/);
      await onUpdate({first_name: firstName, last_name: lastName.join(' ')});
    },
    [onUpdate],
  );

  const handleBusinessSave = useCallback(
    async (value: string) => {
      await onUpdate({business_name: value.trim()});
    },
    [onUpdate],
  );

  const handlePhoneSave = useCallback(
    async (value: string) => {
      await onUpdate({phone: value.trim()});
    },
    [onUpdate],
  );

  const handleWhatsappSave = useCallback(
    async (value: string) => {
      await onUpdate({whatsapp_number: value.trim()});
    },
    [onUpdate],
  );

  return (
    <div className="flex flex-col gap-2 md:gap-5">
      <SettingsSectionHeader
        description="Your name and how clients reach you"
        title="Profile"
      />

      <div className={CARD_CLASS}>
        <div className="flex items-center gap-3 p-4">
          <Avatar className="size-11 md:size-12">
            <Avatar.Fallback className="bg-accent type-title font-semibold text-accent-foreground">
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
    </div>
  );
}

function AccountPanel({email, onLogout}: {email: string; onLogout: () => void}) {
  return (
    <div className="flex flex-col gap-2 md:gap-5">
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
        className="w-full rounded-panel border border-danger/30"
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
      className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row md:items-stretch"
      onSelectionChange={(key) => onTabChange(key as SettingsTab)}
      orientation={isDesktop ? 'vertical' : 'horizontal'}
      selectedKey={tab}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-surface pt-3 md:static md:w-53 md:border-b-0 md:border-r md:bg-background md:px-3 md:pt-6">
        <Typography
          className="px-0 pb-2 font-grotesk md:px-2 md:pb-3"
          type="h3"
        >
          Settings
        </Typography>
        <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto md:overflow-visible">
          <Tabs.List>
            {TABS.map(({icon: Icon, id, label}) => (
              <Tabs.Tab
                id={id}
                key={id}
              >
                <Icon className="shrink-0" />
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-3 pb-6 md:px-8 md:pt-6 md:pb-10">
        {/* Panel measure inside the sidebar+content split — not the page column
            (that's Page.Frame size="content" above), so it isn't a size token. */}
        <div className="flex min-h-full flex-1 flex-col md:mx-auto md:w-full md:max-w-140">{children}</div>
      </div>
    </Tabs>
  );
}

export default function Settings() {
  const {data, isError, isLoading, refetch} = useGetCoachProfileQuery();
  const updateProfileMutation = useUpdateCoachProfileMutation();
  const navigate = useNavigate();
  // The URL is the source of truth: /settings/billing opens (and survives a
  // refresh on) the Billing tab. Unknown tab segments fall back to Profile.
  const {tab: tabParam} = useParams();
  const tab: SettingsTab = TABS.some(({id}) => id === tabParam) ? (tabParam as SettingsTab) : 'profile';
  const setTab = useCallback(
    (next: SettingsTab) => {
      navigate(next === 'profile' ? ROUTES.SETTINGS : generatePath(ROUTES.SETTINGS_TAB, {tab: next}), {replace: true});
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    clearTokens();
    disconnectSocket();
    queryClient.clear();
    navigate(ROUTES.LOGIN, {replace: true});
  }, [navigate]);

  if (isLoading) {
    return (
      <Page>
        <Page.Content bare>
          <Page.Frame
            className="pt-6 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Content bare>
          <Page.Frame
            className="pt-6 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load settings."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const profile = data.data;

  return (
    <Page>
      <Page.Content bare>
        <Page.Frame
          className="flex flex-1"
          size="content"
        >
          <SettingsShell
            onTabChange={setTab}
            tab={tab}
          >
            <Tabs.Panel
              className="p-0"
              id="profile"
            >
              <ProfilePanel
                onUpdate={updateProfileMutation.mutateAsync}
                profile={profile}
              />
            </Tabs.Panel>
            <Tabs.Panel
              className="p-0"
              id="team"
            >
              <TeamSection />
            </Tabs.Panel>
            <Tabs.Panel
              className="p-0"
              id="billing"
            >
              <BillingSection />
            </Tabs.Panel>
            <Tabs.Panel
              className="p-0"
              id="account"
            >
              <AccountPanel
                email={profile.email}
                onLogout={handleLogout}
              />
            </Tabs.Panel>

            <LogOutFooter
              className="mt-auto pt-4 md:hidden"
              onLogout={handleLogout}
            />
          </SettingsShell>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
