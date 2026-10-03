import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {ApiError} from '../api/client';
import {type TeamMemberInvite, useInviteCoach, useTeam} from '../api/team';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {OwnerOnly} from '../ui/owner-only';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {coachName, coachStatus} from './team-labels';

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
  const form = useForm<TeamMemberInvite>({defaultValues: {full_name: '', preferred_name: '', email: '', phone: ''}});
  const mutation = useInviteCoach();
  const completed = useRef(false);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const [uncertainEmail, setUncertainEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const pending = form.formState.isSubmitting;
  const locked = pending || Boolean(uncertainEmail);
  const dirty = form.formState.isDirty;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (pending) {
      return;
    }
    const errors = form.formState.errors;
    if (errors.email) {
      form.setFocus('email');
    } else if (errors.full_name) {
      form.setFocus('full_name');
    } else if (errors.preferred_name) {
      form.setFocus('preferred_name');
    } else if (errors.root) {
      errorRef.current?.focus();
    }
  }, [pending, form.formState.errors, form.setFocus]);
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
    if (pending || uncertainEmail) {
      return;
    }
    form.clearErrors();
    try {
      const result = await mutation.mutateAsync({
        email: values.email.trim(),
        full_name: values.full_name?.trim() || '',
        preferred_name: values.preferred_name?.trim() || null,
        phone: values.phone?.trim() || null,
      });
      if (!mounted.current) {
        return;
      }
      completed.current = true;
      navigate(generatePath(routes.teamMember, {id: result.data.id}), {state: {...list.state, invited: true}});
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (!(error instanceof ApiError) || error.status >= 500) {
        setUncertainEmail(values.email.trim());
        form.setError('root', {
          message:
            'The invitation could not be confirmed. Check Team before trying again; sending again replaces the earlier invitation link.',
        });
        return;
      }
      setFormError(
        error,
        'Could not send the invitation. Your details are still here. Please try again.',
        form.setError,
        ['email', 'full_name', 'preferred_name', 'phone'],
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
            isDisabled={locked}
          />
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              label="Full name"
              isRequired
              rules={{validate: (value) => Boolean(value?.trim()) || 'Enter full name.'}}
              maxLength={255}
              isDisabled={locked}
            />
            <FormField
              control={form.control}
              name="preferred_name"
              label="Preferred name"
              description="What should we call you?"
              maxLength={255}
              isDisabled={locked}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Coaches work with the clients assigned to them. You can assign clients after they accept.
          </p>
        </Surface>
        <FormField
          control={form.control}
          name="phone"
          label="Phone"
          type="tel"
          isDisabled={locked}
        />
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3"
        >
          <FormError message={form.formState.errors.root?.message} />
          {uncertainEmail && (
            <Button
              variant="outline"
              onPress={() => setChecking(true)}
            >
              Check Team
            </Button>
          )}
        </div>
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
            isDisabled={Boolean(uncertainEmail)}
          >
            Send invitation
          </Button>
        </FormActions>
      </form>
      {checking && (
        <SavedCoaches
          email={uncertainEmail}
          onClose={() => setChecking(false)}
          onOpen={(id) => {
            completed.current = true;
            navigate(generatePath(routes.teamMember, {id}), {replace: true, state: list.state});
          }}
          onRetry={() => {
            flushSync(() => {
              setChecking(false);
              setUncertainEmail('');
              form.clearErrors('root');
            });
            form.setFocus('email');
          }}
        />
      )}
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
          <p>
            {pending
              ? 'Please wait while the invitation is sending.'
              : uncertainEmail
                ? 'The invitation may already have been sent. Leaving discards your details, but does not revoke a sent invitation.'
                : 'The details you entered will be discarded.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
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

function SavedCoaches({
  email,
  onClose,
  onOpen,
  onRetry,
}: {
  email: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  const query = useTeam({q: email});
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check Team</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>Look for the coach you just invited. Open their details to check their invitation or access.</p>
        <InfiniteList
          query={query}
          label="matching coaches"
          singular="matching coach"
          empty={<p>No matching coaches found.</p>}
        >
          {(coach) => (
            <div className="space-y-3 p-4">
              <div className="wrap-anywhere">
                <p className="font-semibold">{coachName(coach)}</p>
                <p className="text-sm text-muted-foreground">{coach.email}</p>
                <p className="text-sm text-muted-foreground">{coachStatus(coach)}</p>
              </div>
              <Button
                variant="outline"
                onPress={() => onOpen(coach.id)}
              >
                View coach
              </Button>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isPaused && !query.isFetching && !query.hasNextPage && (
          <>
            <p className="text-sm text-muted-foreground">
              If none matches this invitation, return to your details and try sending again.
            </p>
            <Button
              variant="outline"
              onPress={onRetry}
            >
              Return and retry
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Keep my details
        </Button>
      </div>
    </Dialog>
  );
}
