import {Avatar, Button, Separator, Spinner, Typography} from '@heroui/react';
import {ChevronRight} from 'lucide-react';
import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import {clearTokens} from '@/api/authStorage';
import {coachApi} from '@/api/generated';
import {type CoachProfile, useGetCoachProfileQuery, useUpdateCoachProfileMutation} from '@/api/profile';
import EditableRow from '@/settings/components/editable-row';
import {store} from '@/store';

function ProfileSection({
  onUpdate,
  profile,
}: {
  onUpdate: (
    body: Parameters<ReturnType<typeof useUpdateCoachProfileMutation>[0]>[0],
  ) => ReturnType<ReturnType<typeof useUpdateCoachProfileMutation>[0]>;
  profile: CoachProfile;
}) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

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
    <section>
      <SectionHeading title="Profile" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar
            className="size-12"
            color="accent"
          >
            <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <Typography weight="medium">{name || 'No name'}</Typography>
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
    </section>
  );
}

function AcquisitionSection() {
  const navigate = useNavigate();
  return (
    <section className="mt-6">
      <SectionHeading title="Acquisition" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <button
          className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
          onClick={() => navigate(ROUTES.SETTINGS_LANDING_PAGE)}
          type="button"
        >
          <div className="min-w-0 flex-1">
            <Typography type="body-sm">Landing page</Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              Your public page that turns visitors into prospects
            </Typography>
          </div>
          <ChevronRight
            className="shrink-0 text-muted"
            size={18}
          />
        </button>
      </div>
    </section>
  );
}

function ClientProfileSection() {
  const navigate = useNavigate();
  return (
    <section className="mt-6">
      <SectionHeading title="Client profiles" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <button
          className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
          onClick={() => navigate(ROUTES.SETTINGS_PROFILE_FIELDS)}
          type="button"
        >
          <div className="min-w-0 flex-1">
            <Typography type="body-sm">Profile fields</Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              Define the intake questions on each client's profile
            </Typography>
          </div>
          <ChevronRight
            className="shrink-0 text-muted"
            size={18}
          />
        </button>
      </div>
    </section>
  );
}

function AccountSection({email}: {email: string}) {
  return (
    <section className="mt-6">
      <SectionHeading title="Account" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex min-h-11 items-center px-4 py-3">
          <Typography
            className="w-20 shrink-0"
            color="muted"
            type="body-sm"
          >
            Email
          </Typography>
          <Typography
            className="min-w-0 flex-1"
            color="muted"
            truncate
            type="body-sm"
          >
            {email}
          </Typography>
        </div>
        <div className="flex min-h-11 items-center border-t border-border px-4 py-3">
          <Typography
            className="w-20 shrink-0"
            color="muted"
            type="body-sm"
          >
            Auth
          </Typography>
          <Typography
            className="flex-1"
            color="muted"
            type="body-sm"
          >
            Email OTP
          </Typography>
        </div>
      </div>
    </section>
  );
}

export default function Settings() {
  const {data, isError, isLoading, refetch} = useGetCoachProfileQuery();
  const [updateProfile] = useUpdateCoachProfileMutation();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearTokens();
    store.dispatch(coachApi.util.resetApiState());
    navigate('/login', {replace: true});
  }, [navigate]);

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Settings</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Settings</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="max-w-lg">
            <ErrorState message="Couldn't load settings." />
            <Button
              className="mt-3"
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const profile = data.data;

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <Page.Title>Settings</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-lg">
          <ProfileSection
            onUpdate={updateProfile}
            profile={profile}
          />
          <AcquisitionSection />
          <ClientProfileSection />
          <AccountSection email={profile.email} />

          <div className="py-4">
            <Separator className="mb-4" />
            <Button
              className="w-full"
              onPress={handleLogout}
              variant="danger-soft"
            >
              Log out
            </Button>
            <Typography
              align="center"
              className="mt-4"
              color="muted"
              type="body-xs"
            >
              CoachApp v{__APP_VERSION__}
            </Typography>
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}
