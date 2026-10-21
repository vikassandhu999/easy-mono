import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {ApiError} from '../api/client';
import {type ClientInvite, useClients, useInviteClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {CoachSelect} from '../ui/coach-select';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

export function InviteClient() {
  const navigate = useNavigate();
  const listLocation = useListLocation(routes.home);
  const invitation = useInviteClient();
  const account = useProfile();
  const form = useForm<ClientInvite>({
    defaultValues: {full_name: '', preferred_name: '', email: '', phone: '', notes: ''},
  });
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  const [uncertainEmail, setUncertainEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const leaving = useRef(false);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending && form.formState.errors.root) {
      errorRef.current?.focus();
    }
  }, [pending, form.formState.errors.root]);
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending],
    ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  function openClient(id: string) {
    leaving.current = true;
    navigate(generatePath(routes.client, {id}), {replace: true, state: listLocation.state});
  }
  const submit = form.handleSubmit(async (values) => {
    if (pending || uncertainEmail) {
      return;
    }
    try {
      const result = await invitation.mutateAsync({
        full_name: values.full_name?.trim() || '',
        preferred_name: values.preferred_name?.trim() || null,
        email: values.email?.trim() || '',
        phone: values.phone?.trim() || null,
        notes: values.notes?.trim() || null,
        ...(values.coach_id ? {coach_id: values.coach_id} : {}),
      });
      if (mounted.current) {
        openClient(result.data.id);
      }
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (!(error instanceof ApiError) || error.status >= 500) {
        setUncertainEmail(values.email?.trim() || '');
        form.setError('root', {
          message:
            'The invitation could not be confirmed. Check saved clients before trying again. Your details are still here.',
        });
      } else {
        setFormError(error, "We couldn't send the invitation. Please try again.", form.setError, [
          'full_name',
          'preferred_name',
          'email',
          'phone',
          'notes',
          'coach_id',
        ]);
      }
    }
  });

  return (
    <Page>
      <PageHeader
        title="Invite client"
        description="Invitations are free. A seat is used when coaching starts."
        back={{to: listLocation.to, label: 'Back to clients'}}
      />
      <form
        noValidate
        onSubmit={submit}
        className="has-mobile-actions space-y-6"
      >
        <Surface className="space-y-5">
          <div>
            <h2 className="section-title">Client details</h2>
            <p className="mt-1 text-sm text-muted-foreground">Full name and email are required.</p>
          </div>
          <FormField
            control={form.control}
            name="full_name"
            label="Full name"
            autoComplete="name"
            isRequired
            isDisabled={pending || Boolean(uncertainEmail)}
            rules={{validate: (value) => Boolean(value?.trim()) || 'Enter full name.'}}
          />
          <FormField
            control={form.control}
            name="preferred_name"
            label="Preferred name"
            description="What should we call you?"
            autoComplete="nickname"
            isDisabled={pending || Boolean(uncertainEmail)}
          />
          <FormField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            isRequired
            isDisabled={pending || Boolean(uncertainEmail)}
            description="Their invitation will be sent here."
          />
          <FormField
            control={form.control}
            name="phone"
            label="Phone"
            type="tel"
            isDisabled={pending || Boolean(uncertainEmail)}
          />
          <FormField
            control={form.control}
            name="notes"
            label="Coaching notes"
            multiline
            maxLength={255}
            isDisabled={pending || Boolean(uncertainEmail)}
          />
          {account.data?.data.is_owner && (
            <CoachSelect
              isDisabled={pending || Boolean(uncertainEmail)}
              onChange={(coach) => form.setValue('coach_id', coach.id, {shouldDirty: true})}
            />
          )}
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
                Check saved clients
              </Button>
            )}
          </div>
        </Surface>
        <div className="md:col-span-2">
          <FormActions>
            <Link
              className={buttonVariants({variant: 'ghost'})}
              to={listLocation.to}
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
        </div>
      </form>
      {checking && (
        <SavedClients
          email={uncertainEmail}
          onClose={() => setChecking(false)}
          onOpen={openClient}
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
                ? 'The invitation may already have been sent. Leaving discards your entered details, but does not cancel a sent invitation.'
                : 'Your entered details will be lost. No invitation has been sent.'}
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
              Discard invitation
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}

function SavedClients({
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
  const query = useClients({q: email});
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
        <DialogTitle>Check saved clients</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>Look for the client you just invited. Open their details to check the invitation.</p>
        <InfiniteList
          query={query}
          label="matching clients"
          singular="matching client"
          empty={<p>No matching clients found.</p>}
        >
          {(client) => (
            <div className="space-y-3 p-4">
              <div className="break-words">
                <p className="font-semibold">{client.preferred_name || client.full_name || 'Client'}</p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
              <Button
                variant="outline"
                onPress={() => onOpen(client.id)}
              >
                View client
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
