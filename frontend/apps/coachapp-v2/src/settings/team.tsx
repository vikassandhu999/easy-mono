/**
 * Team settings — owner-only. Lists trainers (invited/active/deactivated),
 * lets the owner invite a new trainer, resend/revoke a pending invite, and
 * deactivate an active trainer (their clients reassign to the owner).
 */
import {AlertDialog, Button, Chip, ErrorMessage, Fieldset, Form, Skeleton, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {ErrorState} from '@/@components/error-state';
import {FormActions, FormTextField} from '@/@components/form-fields';
import SectionHeading from '@/@components/section-heading';
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
    <Form
      className="pb-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
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
            <Typography>Deactivate this trainer? Their clients will be reassigned to you.</Typography>
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

function TeamMemberRow({member, onDeactivate}: {member: TeamMember; onDeactivate: () => void}) {
  const [resendInvite, {isLoading: isResending}] = useResendTrainerInviteMutation();
  const [revokeInvite, {isLoading: isRevoking}] = useRevokeTrainerInviteMutation();

  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';

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
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Typography
          truncate
          type="body-sm"
          weight="medium"
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
          color="muted"
          type="body-sm"
        >
          Owner
        </Typography>
      ) : (
        <Chip
          color={STATUS_COLOR[member.status]}
          size="sm"
          variant="soft"
        >
          {STATUS_LABEL[member.status]}
        </Chip>
      )}

      {!member.is_owner && member.status === 'invited' ? (
        <div className="flex shrink-0 gap-2">
          <Button
            isPending={isResending}
            onPress={handleResend}
            size="sm"
            variant="ghost"
          >
            Resend invite
          </Button>
          <Button
            isPending={isRevoking}
            onPress={handleRevoke}
            size="sm"
            variant="ghost"
          >
            Revoke invite
          </Button>
        </div>
      ) : null}

      {!member.is_owner && member.status === 'active' ? (
        <Button
          className="shrink-0"
          onPress={onDeactivate}
          size="sm"
          variant="ghost"
        >
          Deactivate
        </Button>
      ) : null}
    </div>
  );
}

export default function TeamSection() {
  const {data: billing} = useGetBillingQuery();
  const {data, isError, isLoading, refetch} = useGetTeamQuery(undefined, {skip: !billing?.data.is_owner});
  const [isInviting, setIsInviting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<null | TeamMember>(null);

  if (!billing?.data.is_owner) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <SectionHeading
          className="mb-0"
          title="Team"
        />
        <Button
          onPress={() => setIsInviting(true)}
          size="sm"
          variant="ghost"
        >
          Invite trainer
        </Button>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
        <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
          {data.data.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onDeactivate={() => setDeactivateTarget(member)}
            />
          ))}
        </div>
      )}

      <KeyboardSheet
        onClose={() => setIsInviting(false)}
        open={isInviting}
        title="Invite trainer"
      >
        <InviteTrainerForm onDone={() => setIsInviting(false)} />
      </KeyboardSheet>

      <DeactivateTrainerDialog
        member={deactivateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
      />
    </section>
  );
}
