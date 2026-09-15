import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type ClientInvite, useClients, useInviteClient} from '../api/clients';
import {useDefaultIntake} from '../api/forms';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {IntakePreview} from '../ui/intake-preview';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

export function InviteClient() {
  const navigate = useNavigate();
  const listLocation = useListLocation(routes.home);
  const intake = useDefaultIntake();
  const invitation = useInviteClient();
  const form = useForm<Pick<ClientInvite, 'first_name' | 'last_name' | 'email'>>({
    defaultValues: {first_name: '', last_name: '', email: ''},
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
    if (!intake.isSuccess || pending || uncertainEmail) {
      return;
    }
    try {
      const result = await invitation.mutateAsync({
        first_name: values.first_name?.trim() || null,
        last_name: values.last_name?.trim() || null,
        email: values.email?.trim() || null,
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
          'first_name',
          'last_name',
          'email',
        ]);
      }
    }
  });

  return (
    <Page>
      <PageHeader
        title="Invite client"
        description="Invite them to join you and complete their intake."
        back={{to: listLocation.to, label: 'Back to clients'}}
      />
      <form
        noValidate
        onSubmit={submit}
        className="has-mobile-actions grid items-start gap-6 md:grid-cols-2 md:gap-8"
      >
        <Surface className="space-y-5">
          <div>
            <h2 className="section-title">Client details</h2>
            <p className="mt-1 text-sm text-muted-foreground">First name and email are required.</p>
          </div>
          <FormField
            control={form.control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
            isRequired
            isDisabled={pending || Boolean(uncertainEmail)}
            rules={{validate: (value) => Boolean(value?.trim()) || 'Enter first name.'}}
          />
          <FormField
            control={form.control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
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
          {invitation.error instanceof ApiError && invitation.error.code === 'seat_limit_reached' && (
            <p className="text-sm">
              <Link
                className="text-link"
                to={routes.billing}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open billing in a new tab
              </Link>{' '}
              to check capacity. Your invitation stays here.
            </p>
          )}
        </Surface>
        <section className="space-y-4">
          <div>
            <h2 className="section-title">Their intake form</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ready for them as soon as they accept. You can preview the questions before sending.
            </p>
          </div>
          {intake.isPending ? (
            <Surface>
              <p
                role="status"
                className="py-5 text-sm text-muted-foreground"
              >
                Loading intake…
              </p>
            </Surface>
          ) : intake.isError ? (
            <Surface className="space-y-4">
              <FormError message={errorMessage(intake.error, "We couldn't load the intake. Please try again.")} />
              <Button
                variant="outline"
                onPress={() => {
                  intake.refetch();
                }}
              >
                Try again
              </Button>
            </Surface>
          ) : (
            <IntakePreview template={intake.data.data} />
          )}
        </section>
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
              isDisabled={!intake.isSuccess || Boolean(uncertainEmail)}
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
  const query = useClients({search: email});
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
                <p className="font-semibold">
                  {`${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'Client'}
                </p>
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
