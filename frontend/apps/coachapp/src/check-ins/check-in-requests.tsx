import {useCallback, useEffect, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {
  generatePath,
  Link,
  useBeforeUnload,
  useBlocker,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {type CheckInRequest, useCheckInRequests, useUpdateCheckInRequest} from '../api/check-in-requests';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

const statusLabels = {
  assigned: 'Waiting for an answer',
  in_progress: 'In progress',
  missed: 'Missed',
  completed: 'Completed',
  dismissed: 'Dismissed',
} satisfies Record<CheckInRequest['status'], string>;
type Action = 'manage' | 'dismiss' | 'reopen';

export function CheckInRequests() {
  const {id = ''} = useParams();
  return (
    <Requests
      key={id}
      clientId={id}
    />
  );
}

function Requests({clientId}: {clientId: string}) {
  const client = useClient(clientId);
  const [params, setParams] = useSearchParams();
  const entry: unknown = useLocation().state;
  const scheduleSearch =
    entry &&
    typeof entry === 'object' &&
    'scheduleSearch' in entry &&
    typeof entry.scheduleSearch === 'string' &&
    entry.scheduleSearch.startsWith('?')
      ? entry.scheduleSearch
      : '';
  const value = params.get('status');
  const status =
    value === 'all' || value === 'completed' || value === 'dismissed' || value === 'missed' ? value : 'outstanding';
  const query = useCheckInRequests(clientId, {status, search: params.get('search')?.trim() ?? ''});
  const [editing, setEditing] = useState<{request: CheckInRequest; action: Action}>();
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);
  const person = client.data?.data;
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'Client';
  function open(request: CheckInRequest, action: Action) {
    setNotice('');
    setEditing({request, action});
  }
  return (
    <Page>
      <PageHeader
        title="Requested check-ins"
        description={`${name} · Follow up on individual check-ins. Changes here do not affect the recurring schedule.`}
        back={{to: generatePath(routes.clientCheckIns, {id: clientId}) + scheduleSearch, label: 'Back to schedules'}}
      />
      <Link
        to={generatePath(routes.clientCheckInResponses, {clientId})}
        className="text-link"
      >
        View submitted responses
      </Link>
      {!person ? (
        <Surface>
          {client.isPending ? (
            <p role="status">Loading client…</p>
          ) : (
            <>
              <FormError message={errorMessage(client.error, 'Could not load this client.')} />
              <Button
                onPress={() => {
                  client.refetch();
                }}
              >
                Try again
              </Button>
            </>
          )}
        </Surface>
      ) : (
        <>
          {person.status !== 'active' && (
            <p className="text-sm text-muted-foreground">
              This client is not active. Requests remain available here for reference.
            </p>
          )}
          {notice && (
            <p
              ref={noticeRef}
              role="status"
              tabIndex={-1}
            >
              {notice}
            </p>
          )}
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_12rem]">
            <ListSearch
              label="Search requests"
              placeholder="Search by form name"
            />
            <div className="grid gap-2">
              <span
                id="request-status-label"
                className="text-sm font-medium"
              >
                Show
              </span>
              <SelectField
                id="request-status"
                value={status}
                onChange={(next) => {
                  if (
                    next === 'outstanding' ||
                    next === 'all' ||
                    next === 'completed' ||
                    next === 'dismissed' ||
                    next === 'missed'
                  ) {
                    setParams(
                      (previous) => {
                        const updated = new URLSearchParams(previous);
                        updated.set('status', next);
                        return updated;
                      },
                      {replace: true},
                    );
                  }
                }}
              >
                <SelectItem id="outstanding">Outstanding</SelectItem>
                <SelectItem id="all">All requests</SelectItem>
                <SelectItem id="missed">Missed</SelectItem>
                <SelectItem id="completed">Completed</SelectItem>
                <SelectItem id="dismissed">Dismissed</SelectItem>
              </SelectField>
            </div>
          </div>
          <InfiniteList
            query={query}
            label="check-in requests"
            singular="check-in request"
            empty={
              <Surface>
                <h2 className="section-title">
                  {status === 'outstanding' && !params.get('search')
                    ? 'No outstanding check-ins'
                    : 'No matching requests'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Requests appear when a scheduled check-in becomes available. Try another filter or manage the
                  schedule.
                </p>
              </Surface>
            }
          >
            {(request) => (
              <article
                className="space-y-4 p-5"
                aria-label={request.form_name}
              >
                <h2 className="wrap-anywhere text-lg font-semibold">{request.form_name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <StatusBadge tone={request.status === 'completed' ? 'positive' : 'neutral'}>
                    {statusLabels[request.status]}
                  </StatusBadge>
                  <p className="text-muted-foreground">
                    {request.due_date ? (
                      <>
                        Due <time dateTime={request.due_date}>{request.due_date}</time>
                      </>
                    ) : (
                      'No due date'
                    )}
                  </p>
                  {request.priority === 'high' && <span>High priority</span>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {request.latest_submission_id && (
                    <Link
                      className="text-link"
                      to={generatePath(routes.clientCheckInResponse, {clientId, id: request.latest_submission_id})}
                      state={{fromRequests: true, listSearch: `?${params}`, scheduleSearch}}
                    >
                      Read response
                    </Link>
                  )}
                  {person.status === 'active' &&
                    request.status !== 'completed' &&
                    (request.status === 'dismissed' ? (
                      <Button
                        variant="outline"
                        onPress={() => open(request, 'reopen')}
                      >
                        Reopen request
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onPress={() => open(request, 'manage')}
                        >
                          Manage request
                        </Button>
                        <Button
                          variant="ghost"
                          onPress={() => open(request, 'dismiss')}
                        >
                          Dismiss request
                        </Button>
                      </>
                    ))}
                </div>
              </article>
            )}
          </InfiniteList>
        </>
      )}
      {editing && (
        <RequestAction
          request={editing.request}
          action={editing.action}
          onClose={() => setEditing(undefined)}
          onSaved={(message) => {
            setEditing(undefined);
            setNotice(message);
          }}
          refresh={async () => !(await query.refetch()).isError}
        />
      )}
    </Page>
  );
}

function RequestAction({
  request,
  action,
  onClose,
  onSaved,
  refresh,
}: {
  request: CheckInRequest;
  action: Action;
  onClose: () => void;
  onSaved: (message: string) => void;
  refresh: () => Promise<boolean>;
}) {
  const update = useUpdateCheckInRequest(request.client_id);
  const form = useForm<{due_date: string; priority: CheckInRequest['priority']}>({
    defaultValues: {due_date: request.due_date ?? '', priority: request.priority},
  });
  const [discard, setDiscard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const mounted = useRef(true);
  const completed = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dirty = form.formState.isDirty;
  const pending = update.isPending || refreshing;
  const blocker = useBlocker(useCallback(() => (dirty || pending) && !completed.current, [dirty, pending]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if ((dirty || pending) && !completed.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  useEffect(() => {
    if ((update.isError || refreshError) && !pending) {
      errorRef.current?.focus();
    }
  }, [update.isError, refreshError, pending]);
  const close = () => {
    if (pending) {
      return;
    }
    if (dirty) {
      setDiscard(true);
    } else {
      onClose();
    }
  };
  const save = form.handleSubmit(async (values) => {
    if (update.isError || pending) {
      return;
    }
    try {
      await update.mutateAsync({
        request,
        body:
          action === 'manage'
            ? {
                ...(values.due_date !== (request.due_date ?? '') ? {due_date: values.due_date || null} : {}),
                ...(values.priority !== request.priority ? {priority: values.priority} : {}),
              }
            : {status: action === 'dismiss' ? 'dismissed' : 'assigned'},
      });
      if (mounted.current) {
        completed.current = true;
        onSaved(
          action === 'manage'
            ? 'Request details saved.'
            : action === 'dismiss'
              ? 'Request dismissed. Its schedule is unchanged.'
              : 'Request reopened for your client.',
        );
      }
    } catch {
      /* Preserve the request and draft for explicit refresh. */
    }
  });
  return (
    <>
      <Dialog
        isOpen
        isDismissable={!pending}
        isKeyboardDismissDisabled={pending}
        showCloseButton={!pending}
        onOpenChange={(open) => {
          if (!open) {
            close();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {action === 'manage'
              ? 'Manage request'
              : action === 'dismiss'
                ? 'Dismiss this request?'
                : 'Reopen this request?'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="dialog-body space-y-5"
          noValidate
          onSubmit={save}
        >
          <p className="wrap-anywhere font-semibold">{request.form_name}</p>
          {action === 'manage' ? (
            <>
              <FormField
                control={form.control}
                name="due_date"
                label="Due date"
                type="date"
                description="Leave blank when there is no deadline."
                isDisabled={pending || update.isError}
              />
              <div className="grid gap-2">
                <label
                  id="request-priority-label"
                  htmlFor="request-priority"
                  className="text-sm font-medium"
                >
                  Priority
                </label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({field}) => (
                    <SelectField
                      id="request-priority"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      triggerRef={field.ref}
                      isDisabled={pending || update.isError}
                    >
                      <SelectItem id="normal">Normal</SelectItem>
                      <SelectItem id="high">High</SelectItem>
                    </SelectField>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Only this request changes. Future check-ins keep their scheduled dates.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {action === 'dismiss'
                ? 'Your client will no longer need to answer this request. You can reopen it later. Future scheduled check-ins continue as usual.'
                : 'Make this request available to your client again with the same due date and priority. This does not create another request.'}
            </p>
          )}
          <div
            ref={errorRef}
            tabIndex={-1}
          >
            {update.isError && (
              <FormError
                message={
                  update.error instanceof ApiError && update.error.code === 'assignment_changed'
                    ? 'This request changed, possibly because your client submitted it. Refresh to review its current status before making another change.'
                    : 'The change could not be confirmed. Refresh requests to check the saved result before making another change. Your draft is still here.'
                }
              />
            )}
            {refreshError && (
              <FormError message="Could not refresh requests. Your draft is still here; try again when connected." />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              autoFocus={action !== 'manage'}
              isDisabled={pending}
              onPress={close}
            >
              Cancel
            </Button>
            {update.isError ? (
              <Button
                isPending={refreshing}
                onPress={async () => {
                  setRefreshing(true);
                  setRefreshError(false);
                  const ok = await refresh();
                  if (!mounted.current) {
                    return;
                  }
                  setRefreshing(false);
                  if (ok) {
                    completed.current = true;
                    onSaved('Requests refreshed. Review the current status before making another change.');
                  } else {
                    setRefreshError(true);
                  }
                }}
              >
                Refresh requests
              </Button>
            ) : (
              <Button
                type="submit"
                isPending={pending}
                isDisabled={action === 'manage' && !dirty}
              >
                {action === 'manage' ? 'Save request' : action === 'dismiss' ? 'Dismiss request' : 'Reopen request'}
              </Button>
            )}
          </div>
        </form>
      </Dialog>
      <Dialog
        isOpen={discard || blocker.state === 'blocked'}
        showCloseButton={false}
        onOpenChange={(open) => {
          if (!open) {
            setDiscard(false);
            if (blocker.state === 'blocked') {
              blocker.reset();
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{pending ? 'Saving request' : 'Discard request changes?'}</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p>
            {pending
              ? 'Wait for this request to finish before leaving.'
              : 'Your unsaved due date and priority will be lost.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onPress={() => {
                setDiscard(false);
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              {pending ? 'Stay here' : 'Keep editing'}
            </Button>
            {!pending && (
              <Button
                variant="outline"
                onPress={() => {
                  completed.current = true;
                  if (blocker.state === 'blocked') {
                    blocker.proceed();
                  } else {
                    onClose();
                  }
                }}
              >
                Discard changes
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
