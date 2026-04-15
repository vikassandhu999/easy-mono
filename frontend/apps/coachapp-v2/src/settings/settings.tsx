import {Avatar, Button, Separator, Spinner} from '@heroui/react';
import {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {clearTokens} from '@/api/authStorage';
import {api} from '@/api/base';
import {type CoachProfile, useGetCoachProfileQuery, useUpdateCoachProfileMutation} from '@/api/profile';
import PageLayout from '@/@components/page-layout';
import {store} from '@/store';

import EditableRow from '@/settings/components/editable-row';
import SectionHeading from '@/settings/components/section-heading';

// ── Helpers ─────────────────────────────────────────────────

function getInitials(firstName: null | string, lastName: null | string): string {
  const f = firstName?.charAt(0) ?? '';
  const l = lastName?.charAt(0) ?? '';
  return (f + l).toUpperCase() || '?';
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

function splitName(fullName: string): {first_name: string; last_name: string} {
  const spaceIndex = fullName.indexOf(' ');
  if (spaceIndex === -1) return {first_name: fullName, last_name: ''};
  return {first_name: fullName.slice(0, spaceIndex), last_name: fullName.slice(spaceIndex + 1)};
}

// ── Section components ──────────────────────────────────────

function ProfileSection({
  onUpdate,
  profile,
}: {
  onUpdate: (body: Parameters<ReturnType<typeof useUpdateCoachProfileMutation>[0]>[0]) => ReturnType<
    ReturnType<typeof useUpdateCoachProfileMutation>[0]
  >;
  profile: CoachProfile;
}) {
  const fullName = getFullName(profile.first_name, profile.last_name);
  const initials = getInitials(profile.first_name, profile.last_name);

  const handleNameSave = useCallback(
    async (value: string) => {
      const {first_name, last_name} = splitName(value.trim());
      await onUpdate({first_name, last_name}).unwrap();
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
        {/* Header with avatar */}
        <div className="flex items-center gap-3 border-b border-divider p-4">
          <Avatar className="size-12" color="accent">
            <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-medium">{fullName || 'No name'}</p>
            <p className="text-sm text-foreground-500">{profile.business.name}</p>
          </div>
        </div>

        {/* Editable rows */}
        <EditableRow label="Name" onSave={handleNameSave} value={fullName} />
        <EditableRow label="Business" onSave={handleBusinessSave} value={profile.business.name} />
        <EditableRow label="Phone" inputType="tel" onSave={handlePhoneSave} value={profile.phone} />
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
          <Button onPress={handleCopy} size="sm" variant="secondary">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="border-t border-divider px-4 py-2 text-xs text-foreground-400">
          Share this link with clients to invite them
        </p>
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
          <span className="w-20 shrink-0 text-sm text-foreground-400">Email</span>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground-500">{email}</span>
        </div>
        <div className="flex min-h-11 items-center border-t border-divider px-4 py-3">
          <span className="w-20 shrink-0 text-sm text-foreground-400">Auth</span>
          <span className="flex-1 text-sm text-foreground-500">Email OTP</span>
        </div>
      </div>
    </section>
  );
}

// ── Main page ───────────────────────────────────────────────

export default function Settings() {
  const {data, isLoading} = useGetCoachProfileQuery();
  const [updateProfile] = useUpdateCoachProfileMutation();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearTokens();
    store.dispatch(api.util.resetApiState());
    navigate('/login');
  }, [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (!data) return null;

  const profile = data.data;

  return (
    <PageLayout title="Settings">
      <div className="max-w-lg">
        <ProfileSection onUpdate={updateProfile} profile={profile} />
        <InviteLinkSection slug={profile.business.slug} />
        <AccountSection email={profile.email} />

        {/* Logout */}
        <div className="py-4">
          <Separator className="mb-4" />
          <Button className="w-full" color="danger" onPress={handleLogout} variant="ghost">
            Log out
          </Button>
          <p className="mt-4 text-center text-xs text-foreground-400">CoachApp v{__APP_VERSION__}</p>
        </div>
      </div>
    </PageLayout>
  );
}
