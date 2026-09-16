import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {
  generatePath,
  Link,
  useBeforeUnload,
  useBlocker,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  type CheckInSchedule,
  useCheckInSchedules,
  useDeleteCheckInSchedule,
  useSaveCheckInSchedule,
} from '../api/check-in-schedules';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormPreview} from '../ui/form-preview';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {frequencyLabels, ScheduleFields} from './schedule-fields';

export function CheckInSchedules() {
  const {id = ''} = useParams();
  return (
    <Schedules
      key={id}
      clientId={id}
    />
  );
}
function Schedules({clientId}: {clientId: string}) {
  const client = useClient(clientId);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const initialNotice: unknown = location.state;
  const [notice, setNotice] = useState(
    initialNotice &&
      typeof initialNotice === 'object' &&
      'checkInNotice' in initialNotice &&
      typeof initialNotice.checkInNotice === 'string'
      ? initialNotice.checkInNotice
      : '',
  );
  const [editing, setEditing] = useState<CheckInSchedule>();
  const [stopping, setStopping] = useState<CheckInSchedule>();
  const [removing, setRemoving] = useState<CheckInSchedule>();
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);
  const status = params.get('status') === 'active' ? 'active' : params.get('status') === 'stopped' ? 'stopped' : 'all';
  const query = useCheckInSchedules(clientId, {
    search: params.get('search')?.trim() ?? '',
    ...(status === 'all' ? {} : {active: status === 'active'}),
  });
  const person = client.data?.data;
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'Client';
  return (
    <Page>
      <PageHeader
        title={`Check-ins for ${name}`}
        description="Manage the forms your client receives and when they are due."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
        actions={
          person?.status === 'active' ? (
            <Link
              to={generatePath(routes.createCheckIn, {id: clientId})}
              state={{listSearch: location.search}}
              className={buttonVariants()}
            >
              Schedule check-in
            </Link>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-5">
        <Link
          className="text-link"
          to={generatePath(routes.checkInRequests, {id: clientId})}
          state={{scheduleSearch: location.search}}
        >
          View requested check-ins
        </Link>
        <Link
          to={generatePath(routes.clientCheckInResponses, {clientId})}
          className="text-link"
        >
          View submitted responses
        </Link>
      </div>
      {client.isError ? (
        <Surface>
          <FormError message={errorMessage(client.error, 'Could not load this client.')} />
          <Button
            onPress={() => {
              client.refetch();
            }}
          >
            Try again
          </Button>
        </Surface>
      ) : !person ? (
        <p role="status">Loading client…</p>
      ) : (
        <>
          {person.status !== 'active' && (
            <p className="text-sm text-muted-foreground">
              This client is not active. New check-ins are generated only for active clients.
            </p>
          )}
          {notice && (
            <p
              ref={noticeRef}
              tabIndex={-1}
              role="status"
            >
              {notice}
            </p>
          )}
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_12rem]">
            <ListSearch label="Search schedules" />
            <div className="grid gap-2">
              <span
                id="schedule-status-label"
                className="text-sm font-medium"
              >
                Show
              </span>
              <SelectField
                id="schedule-status"
                value={status}
                onChange={(value) =>
                  setParams(
                    (previous) => {
                      const next = new URLSearchParams(previous);
                      if (value === 'active' || value === 'stopped') {
                        next.set('status', value);
                      } else {
                        next.delete('status');
                      }
                      return next;
                    },
                    {replace: true},
                  )
                }
              >
                <SelectItem id="all">All schedules</SelectItem>
                <SelectItem id="active">Active</SelectItem>
                <SelectItem id="stopped">Stopped</SelectItem>
              </SelectField>
            </div>
          </div>
          <InfiniteList
            query={query}
            label="check-in schedules"
            singular="check-in schedule"
            empty={
              <Surface>
                <h2 className="section-title">
                  {params.get('search') || status !== 'all' ? 'No matching schedules' : 'No check-ins scheduled'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {params.get('search') || status !== 'all'
                    ? 'Try another name or change the status filter.'
                    : 'Start with a form and a first due date. You can adjust the cadence later.'}
                </p>
              </Surface>
            }
          >
            {(schedule) => (
              <article
                className="space-y-4 p-5"
                aria-label={schedule.form_template.name}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="wrap-anywhere text-lg font-semibold">{schedule.form_template.name}</h2>
                  <span className="text-sm text-muted-foreground">{schedule.active ? 'Active' : 'Stopped'}</span>
                </div>
                <p className="text-sm">
                  {frequencyLabels[schedule.frequency]} · {schedule.active ? 'Next due' : 'Saved due date'}{' '}
                  <time dateTime={schedule.next_due_on}>{schedule.next_due_on}</time>
                </p>
                {!schedule.active && (
                  <p className="text-sm text-muted-foreground">
                    No further check-ins will be generated. Existing check-ins remain available.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onPress={() => {
                      setNotice('');
                      setEditing(schedule);
                    }}
                  >
                    {schedule.active ? 'Edit schedule' : 'Resume schedule'}
                  </Button>
                  <FormPreview values={schedule.form_template} />
                  {schedule.active && (
                    <Button
                      variant="ghost"
                      onPress={() => {
                        setNotice('');
                        setStopping(schedule);
                      }}
                    >
                      Stop scheduling
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setNotice('');
                      setRemoving(schedule);
                    }}
                  >
                    Delete schedule
                  </Button>
                </div>
              </article>
            )}
          </InfiniteList>
        </>
      )}
      {editing && (
        <EditSchedule
          initial={editing}
          clientId={clientId}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setNotice(editing.active ? 'Schedule updated.' : 'Schedule resumed.');
            setEditing(undefined);
          }}
        />
      )}
      {stopping && (
        <StopSchedule
          schedule={stopping}
          clientId={clientId}
          onClose={() => setStopping(undefined)}
          onSaved={() => {
            setStopping(undefined);
            setNotice('Schedule stopped. Existing check-ins remain available.');
          }}
        />
      )}
      {removing && (
        <DeleteSchedule
          schedule={removing}
          clientId={clientId}
          onClose={() => setRemoving(undefined)}
          onDeleted={(result) => {
            setRemoving(undefined);
            setNotice(result === 'deleted' ? 'Schedule deleted.' : 'This schedule is no longer available.');
          }}
          onStop={() => {
            setRemoving(undefined);
            setStopping(removing);
          }}
        />
      )}
    </Page>
  );
}

function DeleteSchedule({
  schedule,
  clientId,
  onClose,
  onDeleted,
  onStop,
}: {
  schedule: CheckInSchedule;
  clientId: string;
  onClose: () => void;
  onDeleted: (result: string) => void;
  onStop: () => void;
}) {
  const remove = useDeleteCheckInSchedule(clientId);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const used = remove.error instanceof ApiError && remove.error.code === 'schedule_has_assignments';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (remove.isError && !remove.isPending) {
      errorRef.current?.focus();
    }
  }, [remove.isError, remove.isPending]);
  return (
    <Dialog
      isOpen
      isDismissable={!remove.isPending}
      showCloseButton={!remove.isPending}
      onOpenChange={(open) => {
        if (!open && !remove.isPending) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Delete this schedule?</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="wrap-anywhere font-semibold">{schedule.form_template.name}</p>
        <p className="text-sm text-muted-foreground">
          {frequencyLabels[schedule.frequency]} · {schedule.next_due_on}
        </p>
        <p>
          Delete only if this schedule has not generated any check-ins. This cannot be undone. The form stays in your
          library.
        </p>
        <div
          ref={errorRef}
          tabIndex={-1}
        >
          {remove.isError && (
            <FormError
              message={
                used
                  ? schedule.active
                    ? 'This schedule already generated check-ins and must be kept with their history. Stop scheduling to prevent new check-ins.'
                    : 'This schedule already generated check-ins and must be kept with their history. Scheduling is already stopped.'
                  : errorMessage(
                      remove.error,
                      'Deletion could not be confirmed. Retry the same schedule or close and refresh the list.',
                    )
              }
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            autoFocus
            isDisabled={remove.isPending}
            onPress={onClose}
          >
            Keep schedule
          </Button>
          {used ? (
            schedule.active && <Button onPress={onStop}>Stop scheduling instead</Button>
          ) : (
            <Button
              variant="destructive"
              isPending={remove.isPending}
              onPress={async () => {
                try {
                  const result = await remove.mutateAsync(schedule.id);
                  if (mounted.current) {
                    onDeleted(result);
                  }
                } catch {
                  /* The mutation error is shown in the confirmation. */
                }
              }}
            >
              {remove.isError ? 'Retry deletion' : 'Delete schedule'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function EditSchedule({
  initial,
  clientId,
  onClose,
  onSaved,
}: {
  initial: CheckInSchedule;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<ScheduleFields>({
    defaultValues: {
      form_template_id: initial.form_template_id,
      frequency: initial.frequency,
      next_due_on: initial.active ? initial.next_due_on : '',
    },
  });
  const save = useSaveCheckInSchedule(clientId);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const [discarding, setDiscarding] = useState(false);
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending) {
      if (form.formState.errors.next_due_on) {
        form.setFocus('next_due_on');
      } else if (form.formState.errors.frequency) {
        form.setFocus('frequency');
      } else if (form.formState.errors.root || form.formState.errors.form_template_id) {
        errorRef.current?.focus();
      }
    }
  }, [pending, form.formState.errors, form.setFocus]);
  const blocker = useBlocker(dirty || pending);
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
  function close() {
    if (dirty) {
      setDiscarding(true);
    } else {
      onClose();
    }
  }
  return (
    <>
      <Dialog
        isOpen
        isDismissable={!pending}
        showCloseButton={!pending}
        onOpenChange={(open) => {
          if (!open && !pending) {
            close();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{initial.active ? 'Edit schedule' : 'Resume schedule'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            if (pending) {
              return;
            }
            form.clearErrors();
            try {
              await save.mutateAsync({
                kind: 'update',
                id: initial.id,
                body: {
                  ...(values.frequency === initial.frequency ? {} : {frequency: values.frequency}),
                  ...(values.next_due_on === initial.next_due_on ? {} : {next_due_on: values.next_due_on}),
                  ...(!initial.active ? {active: true} : {}),
                },
              });
              if (mounted.current) {
                form.reset(values);
                onSaved();
              }
            } catch (error) {
              if (mounted.current) {
                setFormError(
                  error,
                  'The save could not be confirmed. Your edits are still here. Close to review the schedule before retrying.',
                  form.setError,
                  ['next_due_on', 'frequency', 'form_template_id'],
                );
              }
            }
          })}
        >
          <div className="dialog-body space-y-5">
            <p className="break-words font-semibold">{initial.form_template.name}</p>
            {!initial.active && (
              <p className="text-sm text-muted-foreground">
                Choose the next due date to start generating check-ins again.
              </p>
            )}
            <ScheduleFields
              form={form}
              disabled={pending}
            />
            <p className="text-sm text-muted-foreground">
              Changes apply to future check-ins. Existing check-ins keep their due dates.
            </p>
            <div
              ref={errorRef}
              tabIndex={-1}
            >
              <FormError
                message={form.formState.errors.root?.message || form.formState.errors.form_template_id?.message}
              />
            </div>
          </div>
          <div className="flex justify-between gap-3 border-t border-border p-4">
            <Button
              variant="ghost"
              isDisabled={pending}
              onPress={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isPending={pending}
              isDisabled={initial.active && !dirty}
            >
              {initial.active ? 'Save changes' : 'Resume schedule'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        isOpen={discarding || blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            setDiscarding(false);
            if (blocker.state === 'blocked') {
              blocker.reset();
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Discard schedule changes?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved edits will be lost.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              onPress={() => {
                setDiscarding(false);
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
                } else {
                  onClose();
                }
              }}
            >
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function StopSchedule({
  schedule,
  clientId,
  onClose,
  onSaved,
}: {
  schedule: CheckInSchedule;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSaveCheckInSchedule(clientId);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Dialog
      isOpen
      isDismissable={!save.isPending}
      showCloseButton={!save.isPending}
      onOpenChange={(open) => {
        if (!open && !save.isPending) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Stop scheduling this check-in?</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="wrap-anywhere font-semibold">{schedule.form_template.name}</p>
        <p>
          No new check-ins will be generated. Your client can still answer existing check-ins, and you can resume this
          schedule later.
        </p>
        {save.isError && (
          <FormError
            message={errorMessage(
              save.error,
              'The change could not be confirmed. Close to review the current status before retrying.',
            )}
          />
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            autoFocus
            isDisabled={save.isPending}
            onPress={onClose}
          >
            Keep schedule
          </Button>
          <Button
            isPending={save.isPending}
            onPress={async () => {
              try {
                await save.mutateAsync({kind: 'update', id: schedule.id, body: {active: false}});
                if (mounted.current) {
                  onSaved();
                }
              } catch {
                /* Error is displayed beside the action. */
              }
            }}
          >
            Stop scheduling
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
