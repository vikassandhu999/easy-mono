/**
 * Team settings — owner-only. Lists trainers (invited/active/deactivated),
 * lets the owner invite a new trainer, resend/revoke a pending invite, and
 * deactivate an active trainer (their clients reassign to the owner).
 *
 * `Invite trainer` follows the canonical responsive-overlay rule (UI-CONTRACT
 * §2): one `InviteTrainerForm` behind a `Popover` on desktop and a
 * `KeyboardSheet` on mobile. The deactivate confirm stays a centered
 * `AlertDialog` at both widths.
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
  Popover,
  Skeleton,
  Typography,
  toast,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {UserPlus} from 'lucide-react';
import {useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {ErrorState} from '@/@components/error-state';
import {FormActions, FormTextField} from '@/@components/form-fields';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {useGetBillingQuery} from '@/api/billing';
import {applyFormErrors, getApiErrorMessage} from '@/api/shared';
import {
  type TeamMember,
  useDeactivateTrainerMutation,
  useGetTeamQuery,
  useInviteTrainerMutation,
  useResendTrainerInviteMutation,
  useRevokeTrainerInviteMutation,
} from '@/api/team';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import {SettingsSectionHeader} from '@/settings/components/settings-section-header';

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

function InviteTrainerForm({onDone}: {onDone: () => void}) {
  const [inviteTrainer, {isLoading}] = useInviteTrainerMutation();

  const form = useForm<InviteTrainerFormValues>({
    defaultValues: {email: '', first_name: '', last_name: ''},
    resolver: zodResolver(inviteTrainerSchema),
  });

  const onSubmit = async (values: InviteTrainerFormValues) => {
    try {
      await inviteTrainer({
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
      }).unwrap();
      toast.success('Invite sent');
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
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <Typography
        className="mb-3"
        color="muted"
        type="body-sm"
      >
        {INVITE_BLURB}
      </Typography>
      <Fieldset>
        <Fieldset.Group>
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
          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'email'}}
            isRequired
            label="Email"
            name="email"
            type="email"
          />
        </Fieldset.Group>
      </Fieldset>

      {form.formState.errors.root ? <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage> : null}

      <FormActions
        isSubmitting={isLoading}
        onCancel={onDone}
        submitLabel="Send invite"
        submittingLabel="Sending invite"
      />
    </Form>
  );
}

function InviteTrainerControl() {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const trigger = (
    <Button
      onPress={() => setOpen(true)}
      ref={triggerRef}
      size="sm"
      variant="primary"
    >
      <UserPlus className="size-4" />
      Invite trainer
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Popover
          isOpen={open}
          onOpenChange={(next) => !next && setOpen(false)}
        >
          <Popover.Content
            className="w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="max-h-[70vh] overflow-y-auto p-4 outline-none">
              <Typography
                className="mb-1 font-grotesk"
                type="h5"
              >
                {INVITE_TITLE}
              </Typography>
              {open ? <InviteTrainerForm onDone={() => setOpen(false)} /> : null}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </>
    );
  }

  return (
    <>
      {trigger}
      <KeyboardSheet
        onClose={() => setOpen(false)}
        open={open}
        title={INVITE_TITLE}
      >
        {open ? <InviteTrainerForm onDone={() => setOpen(false)} /> : null}
      </KeyboardSheet>
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
  const [deactivateTrainer, {isLoading}] = useDeactivateTrainerMutation();

  const handleDeactivate = async () => {
    if (!member) {
      return;
    }
    try {
      await deactivateTrainer(member.id).unwrap();
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
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-100">
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

function memberName(member: TeamMember): string {
  return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
}

function TeamMemberRow({member, onDeactivate}: {member: TeamMember; onDeactivate: () => void}) {
  const [resendInvite, {isLoading: isResending}] = useResendTrainerInviteMutation();
  const [revokeInvite, {isLoading: isRevoking}] = useRevokeTrainerInviteMutation();

  const name = memberName(member);

  const handleResend = async () => {
    try {
      await resendInvite(member.id).unwrap();
      toast.success('Invite resent');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't resend invite"));
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeInvite(member.id).unwrap();
      toast.success('Invite revoked');
    } catch (err) {
      toast.danger(getApiErrorMessage(err, "Couldn't revoke invite"));
    }
  };

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
      <Avatar className="size-9 shrink-0">
        <Avatar.Fallback className="bg-background text-chip text-muted">
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
    </div>
  );
}

export default function TeamSection() {
  const {data: billing} = useGetBillingQuery();
  const {data, isError, isLoading, refetch} = useGetTeamQuery(undefined, {skip: !billing?.data.is_owner});
  const [deactivateTarget, setDeactivateTarget] = useState<null | TeamMember>(null);

  if (!billing?.data.is_owner) {
    return (
      <div className="flex flex-col gap-2.5 md:gap-5">
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
    <div className="flex flex-col gap-2.5 md:gap-5">
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
          <ErrorState message="Couldn't load team" />
          <Button
            className="mt-3"
            onPress={() => refetch()}
            size="sm"
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onDeactivate={() => setDeactivateTarget(member)}
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
    </div>
  );
}
