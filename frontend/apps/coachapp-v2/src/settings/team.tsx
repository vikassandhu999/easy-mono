/**
 * Team settings — owner-only. Lists trainers (invited/active/deactivated),
 * lets the owner invite a new trainer, resend/revoke a pending invite,
 * deactivate an active trainer (their clients reassign to the owner), and
 * reactivate a deactivated trainer (clients stay with the owner until reassigned).
 *
 * `Invite trainer` uses `PickerModal` (centered Modal on desktop, KeyboardSheet
 * on mobile) — a short form needs a stable surface, not an anchored popover.
 * Deactivate and reactivate stay centered `AlertDialog` confirms at both widths.
 */
import {getInitials} from '@easy/utils';
import {
  AlertDialog,
  Avatar,
  Button,
  Chip,
  ErrorMessage,
  Fieldset,
  Form,
  Skeleton,
  Spinner,
  Typography,
  toast,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {useGetBillingQuery} from '@/api/billing';
import {applyFormErrors, getApiErrorMessage, omitUndefined} from '@/api/shared';
import {
  type TeamMember,
  useDeactivateTrainerMutation,
  useGetTeamQuery,
  useInviteTrainerMutation,
  useReactivateTrainerMutation,
  useResendTrainerInviteMutation,
  useRevokeTrainerInviteMutation,
} from '@/api/team';
import {SettingsSectionHeader} from '@/settings/settings-section-header';
import {ErrorState} from '@/ui/error-state';
import {FieldRow} from '@/ui/field-row';
import {FormTextField} from '@/ui/form-text-field';
import {PickerModal} from '@/ui/picker-modal';

const INVITE_TITLE = 'Invite a trainer';
const INVITE_BLURB = "They'll get an email invite and take a seat once they join.";

const STATUS_LABEL: Record<TeamMember['status'], string> = {
  invited: 'Invited',
  active: 'Active',
  inactive: 'Deactivated',
};

const STATUS_COLOR: Record<TeamMember['status'], 'default' | 'success' | 'warning'> = {
  invited: 'warning',
  active: 'success',
  inactive: 'default',
};

const inviteTrainerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

type InviteTrainerFormValues = z.infer<typeof inviteTrainerSchema>;

const INVITE_TRAINER_FORM_FIELDS = ['email', 'first_name', 'last_name'] as const;

function InviteTrainerForm({
  isPending,
  onDone,
  onSubmit,
}: {
  isPending: boolean;
  onDone: () => void;
  onSubmit: (values: InviteTrainerFormValues) => Promise<void>;
}) {
  const form = useForm<InviteTrainerFormValues>({
    defaultValues: {email: '', first_name: '', last_name: ''},
    resolver: zodResolver(inviteTrainerSchema),
  });

  const handleSubmit = async (values: InviteTrainerFormValues) => {
    try {
      await onSubmit(values);
      onDone();
    } catch (err) {
      applyFormErrors(
        err,
        "Trainer wasn't invited. Check the details and try again",
        form.setError,
        INVITE_TRAINER_FORM_FIELDS,
      );
    }
  };

  return (
    <Form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <Typography
        color="muted"
        type="body-sm"
      >
        {INVITE_BLURB}
      </Typography>
      <Fieldset>
        <Fieldset.Group>
          <FieldRow className="grid-cols-2">
            <FormTextField
              control={form.control}
              fullWidth
              label="First name"
              name="first_name"
            />
            <FormTextField
              control={form.control}
              fullWidth
              label="Last name"
              name="last_name"
            />
          </FieldRow>
          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'email', placeholder: 'trainer@email.com'}}
            isRequired
            label="Email"
            name="email"
            type="email"
          />
        </Fieldset.Group>
      </Fieldset>

      {form.formState.errors.root ? <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage> : null}

      {/* Overlay dock — page FormActions sticky chrome doesn't belong here. */}
      <div className="mt-1 flex justify-end gap-2">
        <Button
          className="rounded-control"
          isDisabled={isPending}
          onPress={onDone}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="relative rounded-control"
          isPending={isPending}
          type="submit"
        >
          <span className={isPending ? 'invisible' : undefined}>Send invite</span>
          {isPending ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner
                color="current"
                size="sm"
              />
              <span className="sr-only">Sending invite</span>
            </span>
          ) : null}
        </Button>
      </div>
    </Form>
  );
}

function InviteTrainerControl() {
  const [open, setOpen] = useState(false);
  const inviteTrainerMutation = useInviteTrainerMutation();
  const isPending = inviteTrainerMutation.isPending;

  const close = () => {
    if (!isPending) {
      setOpen(false);
    }
  };

  const sendInvite = async (values: InviteTrainerFormValues) => {
    await inviteTrainerMutation.mutateAsync(
      omitUndefined({
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
      }),
    );
    toast.success('Invite sent');
  };

  return (
    <>
      <Button
        onPress={() => setOpen(true)}
        size="sm"
        variant="primary"
      >
        <UserPlus />
        Invite trainer
      </Button>
      <PickerModal
        bodyClassName="px-4 pb-4"
        isDismissable={!isPending}
        onClose={close}
        open={open}
        title={INVITE_TITLE}
      >
        <InviteTrainerForm
          isPending={isPending}
          onDone={() => setOpen(false)}
          onSubmit={sendInvite}
        />
      </PickerModal>
    </>
  );
}

function DeactivateTrainerDialog({
  member,
  onOpenChange,
}: {
  member: null | TeamMember;
  onOpenChange: (open: boolean) => void;
}) {
  const deactivateTrainerMutation = useDeactivateTrainerMutation();
  const isLoading = deactivateTrainerMutation.isPending;

  const handleDeactivate = async () => {
    if (!member) {
      return;
    }
    try {
      await deactivateTrainerMutation.mutateAsync(member.id);
      toast.success('Trainer deactivated');
      onOpenChange(false);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't deactivate trainer"));
    }
  };

  const name = member ? memberName(member) : 'this trainer';

  return (
    <AlertDialog.Backdrop
      isDismissable={!isLoading}
      isOpen={member !== null}
      onOpenChange={onOpenChange}
      variant="transparent"
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>Deactivate trainer?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Typography>Deactivate {name}? Their clients will be reassigned to you.</Typography>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isLoading}
              onPress={() => onOpenChange(false)}
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              isPending={isLoading}
              onPress={handleDeactivate}
              variant="danger"
            >
              {isLoading ? 'Deactivating' : 'Deactivate'}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function ReactivateTrainerDialog({
  member,
  onOpenChange,
}: {
  member: null | TeamMember;
  onOpenChange: (open: boolean) => void;
}) {
  const reactivateTrainerMutation = useReactivateTrainerMutation();
  const isLoading = reactivateTrainerMutation.isPending;

  const handleReactivate = async () => {
    if (!member) {
      return;
    }
    try {
      await reactivateTrainerMutation.mutateAsync(member.id);
      toast.success('Trainer reactivated');
      onOpenChange(false);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't reactivate trainer"));
    }
  };

  const name = member ? memberName(member) : 'this trainer';

  return (
    <AlertDialog.Backdrop
      isDismissable={!isLoading}
      isOpen={member !== null}
      onOpenChange={onOpenChange}
      variant="transparent"
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="success" />
            <AlertDialog.Heading>Reactivate trainer?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Typography>
              Reactivate {name}? They'll be able to sign in again. Clients stay with you until you reassign them.
            </Typography>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isLoading}
              onPress={() => onOpenChange(false)}
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              isPending={isLoading}
              onPress={handleReactivate}
            >
              {isLoading ? 'Reactivating' : 'Reactivate'}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

function TeamMemberRow({
  member,
  onDeactivate,
  onReactivate,
}: {
  member: TeamMember;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const resendInviteMutation = useResendTrainerInviteMutation();
  const revokeInviteMutation = useRevokeTrainerInviteMutation();
  const isResending = resendInviteMutation.isPending;
  const isRevoking = revokeInviteMutation.isPending;

  const name = memberName(member);

  const handleResend = async () => {
    try {
      await resendInviteMutation.mutateAsync(member.id);
      toast.success('Invite resent');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't resend invite"));
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeInviteMutation.mutateAsync(member.id);
      toast.success('Invite revoked');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't revoke invite"));
    }
  };

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
      <Avatar className="size-9 shrink-0">
        <Avatar.Fallback className="bg-background type-eyebrow text-muted">
          {getInitials(member.first_name, member.last_name) || '?'}
        </Avatar.Fallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <Typography
          truncate
          type="body-sm"
          weight="semibold"
        >
          {name}
        </Typography>
        {member.email ? (
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            {member.email}
          </Typography>
        ) : null}
      </div>

      {member.is_owner ? (
        <Typography
          className="shrink-0"
          color="muted"
          type="body-xs"
        >
          Owner
        </Typography>
      ) : (
        <Chip
          className="shrink-0 rounded-chip"
          color={STATUS_COLOR[member.status]}
          size="sm"
          variant="soft"
        >
          {STATUS_LABEL[member.status]}
        </Chip>
      )}

      {!member.is_owner && member.status === 'invited' ? (
        <div className="flex basis-full justify-end gap-2 md:basis-auto md:shrink-0">
          <Button
            className="rounded-control"
            isPending={isResending}
            onPress={handleResend}
            size="sm"
            variant="outline"
          >
            Resend
          </Button>
          <Button
            className="rounded-control text-danger"
            isPending={isRevoking}
            onPress={handleRevoke}
            size="sm"
            variant="outline"
          >
            Revoke
          </Button>
        </div>
      ) : null}

      {!member.is_owner && member.status === 'active' ? (
        <div className="flex basis-full justify-end md:basis-auto md:shrink-0">
          <Button
            className="rounded-control"
            onPress={onDeactivate}
            size="sm"
            variant="outline"
          >
            Deactivate
          </Button>
        </div>
      ) : null}

      {!member.is_owner && member.status === 'inactive' ? (
        <div className="flex basis-full justify-end md:basis-auto md:shrink-0">
          <Button
            className="rounded-control"
            onPress={onReactivate}
            size="sm"
            variant="outline"
          >
            Reactivate
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function TeamSection() {
  const {data: billing} = useGetBillingQuery();
  const {data, isError, isLoading, refetch} = useGetTeamQuery({enabled: !!billing?.data.is_owner});
  const [deactivateTarget, setDeactivateTarget] = useState<null | TeamMember>(null);
  const [reactivateTarget, setReactivateTarget] = useState<null | TeamMember>(null);

  if (!billing?.data.is_owner) {
    return (
      <div className="flex flex-col gap-2 md:gap-5">
        <SettingsSectionHeader
          description="Owner manages access"
          title="Team"
        />
        <Typography
          color="muted"
          type="body-sm"
        >
          Ask the owner to manage the team.
        </Typography>
      </div>
    );
  }

  const members = data?.data ?? [];
  const activeCount = members.filter((member) => member.status === 'active').length;

  return (
    <div className="flex flex-col gap-2 md:gap-5">
      <SettingsSectionHeader
        action={<InviteTrainerControl />}
        description={`${activeCount} active · ${members.length} total · owner manages access`}
        title="Team"
      />

      {isLoading ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError || !data ? (
        <div>
          <ErrorState
            message="Couldn't load team"
            onRetry={refetch}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onDeactivate={() => setDeactivateTarget(member)}
              onReactivate={() => setReactivateTarget(member)}
            />
          ))}
        </div>
      )}

      <DeactivateTrainerDialog
        member={deactivateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
      />

      <ReactivateTrainerDialog
        member={reactivateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReactivateTarget(null);
          }
        }}
      />
    </div>
  );
}
