import {Skeleton, Typography, toast} from '@heroui/react';
import {Check, UserRound, X} from 'lucide-react';

import {type Client} from '@/api/clients';
import {getApiErrorMessage} from '@/api/shared';
import {type TeamMember, useGetTeamQuery, useReassignClientMutation} from '@/api/team';
import AssignSurface from '@/clients/components/assign-surface';
import {formatStatusLabel, softStatusClass} from '@/clients/lib/client-detail-metrics';

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

function initials(member: TeamMember): string {
  const parts = [member.first_name, member.last_name].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    return parts
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return member.email?.charAt(0).toUpperCase() ?? '?';
}

function TrainerPickerContent({
  client,
  currentTrainerId,
  onClose,
}: {
  client: Client;
  currentTrainerId: null | string;
  onClose: () => void;
}) {
  const {data, isError, isLoading} = useGetTeamQuery();
  const [reassignClient, {isLoading: isSaving}] = useReassignClientMutation();
  const members = (data?.data ?? []).filter((member) => member.status === 'active');

  const handlePick = async (member: TeamMember) => {
    try {
      await reassignClient({clientId: client.id, body: {coach_id: member.id}}).unwrap();
      toast.success(`Trainer changed to ${memberName(member)}`);
      onClose();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Trainer wasn't changed. Try again."));
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Change trainer
        </Typography>
        <button
          aria-label="Close"
          className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load trainers.
        </Typography>
      ) : members.length === 0 ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          No active trainers available.
        </Typography>
      ) : (
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {members.map((member) => {
            const selected = member.id === currentTrainerId;
            return (
              <button
                className="flex min-h-11 items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
                disabled={isSaving || selected}
                key={member.id}
                onClick={() => handlePick(member)}
                type="button"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground text-sm font-bold">
                  {initials(member)}
                </span>
                <span className="min-w-0 flex-1">
                  <Typography
                    truncate
                    type="body-sm"
                    weight="semibold"
                  >
                    {memberName(member)}
                  </Typography>
                  <Typography
                    color="muted"
                    truncate
                    type="body-xs"
                  >
                    {member.email}
                  </Typography>
                </span>
                {selected ? (
                  <Check
                    className="text-success"
                    size={16}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClientTrainerCard({client}: {client: Client}) {
  const {data, isLoading} = useGetTeamQuery();
  const assigned = (data?.data ?? []).find((member) => member.id === client.assigned_coach_id) ?? null;

  return (
    <section>
      <div className="mb-5 hidden lg:block">
        <h2 className="font-grotesk text-xl font-bold">Assigned trainer</h2>
        <Typography
          className="mt-1"
          color="muted"
          type="body-sm"
        >
          Managing this client&apos;s programming
        </Typography>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 rounded-[18px]" />
      ) : (
        <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-[18px] lg:rounded-[18px] lg:p-[22px]">
          <div className="flex items-center gap-4">
            <span className="grid size-[54px] shrink-0 place-items-center rounded-[16px] bg-accent text-lg font-bold text-accent-foreground lg:size-[60px] lg:rounded-[17px] lg:text-xl">
              {assigned ? initials(assigned) : <UserRound size={22} />}
            </span>
            <div className="min-w-0 flex-1">
              <Typography
                truncate
                type="body-sm"
                weight="bold"
              >
                {assigned ? memberName(assigned) : 'Unassigned'}
              </Typography>
              <Typography
                className="mt-0.5"
                color="muted"
                type="body-xs"
              >
                {assigned ? assigned.email : 'No trainer selected'}
              </Typography>
            </div>
            {assigned ? (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${softStatusClass(assigned.status)}`}>
                {formatStatusLabel(assigned.status)}
              </span>
            ) : (
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning-soft-foreground">
                Unassigned
              </span>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <AssignSurface label="Change trainer">
              {(close) => (
                <TrainerPickerContent
                  client={client}
                  currentTrainerId={client.assigned_coach_id}
                  onClose={close}
                />
              )}
            </AssignSurface>
          </div>
        </div>
      )}
    </section>
  );
}
