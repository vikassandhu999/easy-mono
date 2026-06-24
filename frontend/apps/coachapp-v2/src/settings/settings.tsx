import {Avatar, Button, Separator, Spinner, Typography} from '@heroui/react';
import {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {clearTokens} from '@/api/authStorage';
import {coachApi} from '@/api/generated';
import {type CoachProfile, useGetCoachProfileQuery, useUpdateCoachProfileMutation} from '@/api/profile';
import EditableRow from '@/settings/components/editable-row';
import SectionHeading from '@/settings/components/section-heading';
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
  const initials = (profile.first_name?.[0] || '' + profile.last_name?.[0] || '').toLowerCase();

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

  return (
    <section>
      <SectionHeading title="Profile" />
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
        <div className="flex items-center gap-3 border-b border-divider p-4">
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
      </div>
    </section>
  );
}

function InviteLinkSection({slug}: {slug: string}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `https://coachapp.in/join/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="mt-6">
      <SectionHeading title="Client invite link" />
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
        <div className="flex items-center gap-2 p-4">
          <div className="min-w-0 flex-1 truncate rounded-lg bg-content2 px-3 py-2 font-mono text-xs text-foreground-500">
            coachapp.in/join/{slug}
          </div>
          <Button
            onPress={handleCopy}
            size="sm"
            variant="secondary"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <Typography
          className="border-t border-divider px-4 py-2"
          color="muted"
          type="body-xs"
        >
          Share this link with clients to invite them
        </Typography>
      </div>
    </section>
  );
}

function AccountSection({email}: {email: string}) {
  return (
    <section className="mt-6">
      <SectionHeading title="Account" />
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
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
        <div className="flex min-h-11 items-center border-t border-divider px-4 py-3">
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
  const {data, isLoading} = useGetCoachProfileQuery();
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
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
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

  if (!data) {
    return null;
  }

  const profile = data.data;

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
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
          <InviteLinkSection slug={profile.business.slug} />
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
