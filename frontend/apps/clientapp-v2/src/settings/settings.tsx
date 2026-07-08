import {Avatar, Button, Separator, Spinner} from '@heroui/react';
import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import SectionHeading from '@/@components/section-heading';
import {clearTokens} from '@/api/authStorage';
import {api} from '@/api/base';
import {
  type ClientCoach,
  type ClientProfile,
  useGetClientProfileQuery,
  useUpdateClientProfileMutation,
} from '@/api/profile';
import {disconnectSocket} from '@/api/socket';
import EditableRow from '@/settings/components/editable-row';
import {store} from '@/store';

// ── Helpers ─────────────────────────────────────────────────

function getInitials(firstName: null | string, lastName: null | string): string {
  const f = firstName?.charAt(0) ?? '';
  const l = lastName?.charAt(0) ?? '';
  return (f + l).toUpperCase() || '?';
}

function getFullName(firstName: null | string, lastName: null | string): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

function splitName(fullName: string): {firstName: string; lastName: string} {
  const spaceIndex = fullName.indexOf(' ');
  if (spaceIndex === -1) {
    return {firstName: fullName, lastName: ''};
  }
  return {firstName: fullName.slice(0, spaceIndex), lastName: fullName.slice(spaceIndex + 1)};
}

/** Strip non-digit characters except leading + for WhatsApp deep link. */
function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

// ── Section components ──────────────────────────────────────

function ProfileSection({
  onUpdate,
  profile,
}: {
  onUpdate: ReturnType<typeof useUpdateClientProfileMutation>[0];
  profile: ClientProfile;
}) {
  const fullName = getFullName(profile.first_name, profile.last_name);
  const initials = getInitials(profile.first_name, profile.last_name);

  const handleNameSave = useCallback(
    async (value: string) => {
      const {firstName, lastName} = splitName(value.trim());
      await onUpdate({first_name: firstName, last_name: lastName}).unwrap();
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
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* Header with avatar */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar
            className="size-12"
            color="accent"
          >
            <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-medium">{fullName || 'No name'}</p>
            <p className="text-sm text-muted">{profile.email || '\u2014'}</p>
          </div>
        </div>

        {/* Editable rows */}
        <EditableRow
          label="Name"
          onSave={handleNameSave}
          value={fullName}
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

function CoachSection({coach}: {coach: ClientCoach}) {
  const coachName = getFullName(coach.first_name, coach.last_name);
  const coachInitials = getInitials(coach.first_name, coach.last_name);

  return (
    <section className="mt-6">
      <SectionHeading title="My coach" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 p-4">
          <Avatar
            className="size-10"
            color="accent"
          >
            <Avatar.Fallback>{coachInitials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{coachName || 'Coach'}</p>
            <p className="text-xs text-muted">{coach.business_name}</p>
          </div>
        </div>
        {coach.phone && (
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <a
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/20"
              href={`https://wa.me/${cleanPhone(coach.phone)}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
            <a
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary"
              href={`tel:${coach.phone}`}
            >
              Call
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function AccountSection({email}: {email: null | string}) {
  return (
    <section className="mt-6">
      <SectionHeading title="Account" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex min-h-11 items-center px-4 py-3">
          <span className="w-20 shrink-0 text-sm text-muted">Email</span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{email || '\u2014'}</span>
        </div>
        <div className="flex min-h-11 items-center border-t border-border px-4 py-3">
          <span className="w-20 shrink-0 text-sm text-muted">Auth</span>
          <span className="flex-1 text-sm text-muted">Email login code</span>
        </div>
      </div>
    </section>
  );
}

// ── Main page ───────────────────────────────────────────────

export default function Settings() {
  const {data, isError, isLoading, refetch} = useGetClientProfileQuery();
  const [updateProfile] = useUpdateClientProfileMutation();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearTokens();
    disconnectSocket();
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

  if (isError || !data) {
    return (
      <PageLayout title="Settings">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-sm text-muted">Couldn&apos;t load your settings. Check your connection and try again.</p>
          <Button
            onPress={() => refetch()}
            size="sm"
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  const profile = data.data;

  return (
    <PageLayout title="Settings">
      <div className="max-w-lg">
        <ProfileSection
          onUpdate={updateProfile}
          profile={profile}
        />
        <CoachSection coach={profile.coach} />
        <AccountSection email={profile.email} />

        {/* Logout */}
        <div className="py-4">
          <Separator className="mb-4" />
          <Button
            className="w-full"
            onPress={handleLogout}
            variant="danger-soft"
          >
            Log out
          </Button>
          <p className="mt-4 text-center text-xs text-muted">CoachEasy v{__APP_VERSION__}</p>
        </div>
      </div>
    </PageLayout>
  );
}
