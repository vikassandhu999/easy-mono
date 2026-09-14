import {useCallback, useRef} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {type TeamMemberInvite, useInviteCoach} from '../api/team';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {useListLocation} from '../ui/list-location';
import {OwnerOnly} from '../ui/owner-only';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

export function InviteCoach() {
  const list = useListLocation(routes.team);
  return (
    <div className="has-mobile-actions mx-auto max-w-2xl">
      <Page>
        <PageHeader
          title="Invite a coach"
          description="They'll receive an email to join your coaching team."
          back={{to: list.to, label: 'Back to team', state: list.state}}
        />
        <OwnerOnly>
          <InvitationForm />
        </OwnerOnly>
      </Page>
    </div>
  );
}
function InvitationForm() {
  const list = useListLocation(routes.team);
  const navigate = useNavigate();
  const form = useForm<TeamMemberInvite>({defaultValues: {first_name: '', last_name: '', email: ''}});
  const mutation = useInviteCoach();
  const completed = useRef(false);
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(() => !completed.current && (dirty || pending));
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!completed.current && (dirty || pending)) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      const result = await mutation.mutateAsync({
        email: values.email.trim(),
        first_name: values.first_name?.trim() || null,
        last_name: values.last_name?.trim() || null,
      });
      completed.current = true;
      navigate(generatePath(routes.teamMember, {id: result.data.id}), {state: {...list.state, invited: true}});
    } catch (error) {
      setFormError(
        error,
        'Could not confirm the invitation. Your details are still here. You can check Team before trying again.',
        form.setError,
        ['email', 'first_name', 'last_name'],
      );
    }
  });
  return (
    <>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-6"
      >
        <Surface className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            isRequired
            maxLength={255}
            isDisabled={pending}
          />
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              label="First name"
              maxLength={255}
              isDisabled={pending}
            />
            <FormField
              control={form.control}
              name="last_name"
              label="Last name"
              maxLength={255}
              isDisabled={pending}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Coaches work with the clients assigned to them. You can assign clients after they accept.
          </p>
        </Surface>
        <FormError message={form.formState.errors.root?.message} />
        <FormActions>
          <Link
            to={list.to}
            state={list.state}
            className={buttonVariants({variant: 'ghost'})}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            isPending={pending}
          >
            Send invitation
          </Button>
        </FormActions>
      </form>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave this invitation?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>The details you entered will be discarded.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Discard and leave
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
