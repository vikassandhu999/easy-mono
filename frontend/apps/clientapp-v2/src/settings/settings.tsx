import {getInitials} from '@easy/utils';
import {Avatar, Button, Separator, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {clearTokens} from '@/api/authStorage';
import {
  type ClientCoach,
  type ClientProfile,
  useGetClientProfileQuery,
  useUpdateClientProfileMutation,
} from '@/api/profile';
import {queryClient} from '@/api/query-client';
import {disconnectSocket} from '@/api/socket';
import EditableRow from '@/settings/editable-row';
import ErrorState from '@/ui/error-state';
import PageLayout from '@/ui/page-layout';
import SectionHeading from '@/ui/section-heading';

// ── Helpers ─────────────────────────────────────────────────

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
  onUpdate: ReturnType<typeof useUpdateClientProfileMutation>['mutateAsync'];
  profile: ClientProfile;
}) {
  const fullName = getFullName(profile.first_name, profile.last_name);
  const initials = getInitials(profile.first_name, profile.last_name) || '?';

  const handleNameSave = useCallback(
    async (value: string) => {
      const {firstName, lastName} = splitName(value.trim());
      await onUpdate({first_name: firstName, last_name: lastName});
    },
    [onUpdate],
  );

  const handlePhoneSave = useCallback(
    async (value: string) => {
      await onUpdate({phone: value.trim()});
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
  const coachInitials = getInitials(coach.first_name, coach.last_name) || '?';

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

function MembershipSection({profile}: {profile: ClientProfile}) {
  const active = profile.status === 'active';
  const formatDate = (value: null | string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'})
      : '—';
  return (
    <section className="mt-6">
      <SectionHeading title="Membership" />
      <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
        <div className="flex items-center gap-3 p-4">
          <span className="min-w-0 flex-1 text-sm font-extrabold">
            Coaching with{' '}
            {getFullName(profile.coach?.first_name ?? null, profile.coach?.last_name ?? null) || 'your coach'}
          </span>
          <span
            className={`rounded-lg border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] ${active ? 'border-success-border bg-success-soft text-success-secondary' : 'border-border bg-surface-secondary text-muted'}`}
          >
            {profile.status.replaceAll('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-2 border-t border-separator">
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Started</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(profile.subscription_started_on)}</p>
          </div>
          <div className="border-l border-separator px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Access through</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(profile.subscription_ends_on)}</p>
          </div>
        </div>
        <p className="border-t border-separator px-4 py-3 text-[11px] leading-[1.5] text-muted">
          Your seat is managed by your coach. Questions about access or billing? Message them directly.
        </p>
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
  const {mutateAsync: updateProfile} = useUpdateClientProfileMutation();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearTokens();
    disconnectSocket();
    queryClient.clear();
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
        <ErrorState
          message="Couldn't load your settings."
          onRetry={() => refetch()}
        />
      </PageLayout>
    );
  }

  const profile = data.data;

  return (
    <PageLayout
      action={
        <Button
          aria-label="Back"
          isIconOnly
          onPress={() => navigate(-1)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={18} />
        </Button>
      }
      title="Settings"
    >
      <div className="max-w-lg">
        <ProfileSection
          onUpdate={updateProfile}
          profile={profile}
        />
        <MembershipSection profile={profile} />
        {profile.coach ? <CoachSection coach={profile.coach} /> : null}
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
