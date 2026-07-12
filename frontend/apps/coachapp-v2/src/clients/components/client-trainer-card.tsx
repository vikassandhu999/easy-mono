import {Button, Skeleton, Typography, toast} from '@heroui/react';
import {Check, UserRound, X} from 'lucide-react';
import {useState} from 'react';

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
  const [selectedTrainerId, setSelectedTrainerId] = useState(currentTrainerId);

  const handleConfirm = async () => {
    const member = members.find((item) => item.id === selectedTrainerId);
    if (!member || member.id === currentTrainerId) {
      return;
    }

    try {
      await reassignClient({clientId: client.id, body: {coach_id: member.id}}).unwrap();
      toast.success(`Trainer changed to ${memberName(member)}`);
      onClose();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Trainer wasn't changed. Try again."));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="flex items-start justify-between gap-4 border-b border-surface-secondary px-6 py-5">
        <div>
          <h3 className="font-grotesk text-xl font-bold">Change trainer</h3>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            Reassign this client to another coach
          </Typography>
        </div>
        <button
          aria-label="Close"
          className="grid size-9 place-items-center rounded-[10px] bg-surface-secondary text-muted"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-[14px]" />
            <Skeleton className="h-16 rounded-[14px]" />
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
          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const selected = member.id === selectedTrainerId;
              return (
                <button
                  className={`flex min-h-16 items-center gap-3 rounded-[14px] border-[1.5px] p-3 text-left transition-colors ${
                    selected ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-hover'
                  }`}
                  disabled={isSaving}
                  key={member.id}
                  onClick={() => setSelectedTrainerId(member.id)}
                  type="button"
                >
                  <span className="grid size-[42px] shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground text-sm font-bold">
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
                    <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Check
                        size={13}
                        strokeWidth={3}
                      />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-surface-secondary px-5 py-4">
        <Button
          className="w-full"
          isDisabled={isSaving}
          onPress={onClose}
          type="button"
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          className="w-full"
          isDisabled={!selectedTrainerId || selectedTrainerId === currentTrainerId}
          isPending={isSaving}
          onPress={handleConfirm}
          type="button"
        >
          Confirm reassignment
        </Button>
      </div>
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

          <div className="mt-4 flex">
            <AssignSurface
              label="Change trainer"
              popoverClassName="p-0"
              triggerClassName="min-h-11 flex-1 justify-center rounded-[12px] bg-accent px-4 text-[13px] font-bold text-accent-foreground! hover:opacity-90"
            >
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
