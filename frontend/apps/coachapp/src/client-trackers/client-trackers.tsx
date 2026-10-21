import {useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {
  type AssignmentWrite,
  type Tracker,
  type TrackerAssignment,
  type TrackerTemplate,
  useApplyTrackerTemplate,
  useChangeTrackerAssignment,
  useChangeTrackerRequest,
  useTrackerAssignments,
  useTrackerRequests,
} from '../api/trackers';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Page, PageHeader, Surface} from '../ui/page';
import {TrackerPicker, TrackerTemplatePicker} from '../ui/tracker-picker';
import {TrackerTiming, trackerTimings, trackerWeekdays} from '../ui/tracker-timing';

export function ClientTrackers() {
  const {clientId = ''} = useParams();
  const client = useClient(clientId);
  const assignments = useTrackerAssignments(clientId);
  const requests = useTrackerRequests(clientId);
  const changeRequest = useChangeTrackerRequest(clientId);
  const [action, setAction] = useState<'add' | 'request' | 'template' | null>(null);
  const [selected, setSelected] = useState<Tracker | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const actionVersion = useRef(0);
  const version = actionVersion.current;
  const person = client.data?.data;
  function chooseAction(value: typeof action) {
    actionVersion.current += 1;
    setSelected(null);
    setAction(value);
    setError('');
    setNotice('');
  }
  function finishAction(message: string) {
    if (actionVersion.current !== version) {
      return;
    }
    setAction(null);
    setSelected(null);
    setNotice(message);
  }
  async function request(input: {tracker_id: string} | {id: string}) {
    setError('');
    try {
      await changeRequest.mutateAsync(input);
      if ('tracker_id' in input) {
        finishAction('Tracker requested.');
      } else {
        setNotice('Request cancelled.');
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Could not update the request. Your choice is still here.'));
    }
  }
  return (
    <Page className="client-page">
      <PageHeader
        title={`Trackers for ${person?.preferred_name || person?.full_name || 'client'}`}
        description="Manage reminders and requests. Entries stay in history when a Tracker is removed."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
        actions={
          <Link
            className={buttonVariants({variant: 'outline'})}
            to={generatePath(routes.trackerHistory, {clientId})}
          >
            All Tracker history
          </Link>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Button onPress={() => chooseAction('add')}>Add Tracker</Button>
        <Button
          variant="outline"
          onPress={() => chooseAction('request')}
        >
          Request Tracker
        </Button>
        <Button
          variant="outline"
          onPress={() => chooseAction('template')}
        >
          Apply template
        </Button>
        <Link
          className={buttonVariants({variant: 'outline'})}
          to={generatePath(routes.recordTracker, {clientId})}
        >
          Record for client
        </Link>
      </div>
      <FormError message={error} />
      {notice && <p role="status">{notice}</p>}
      {action && (
        <Surface className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="editor-section-title">
              {action === 'add'
                ? 'Add a Tracker'
                : action === 'request'
                  ? 'Request a Tracker'
                  : 'Apply a Tracker template'}
            </h2>
            <Button
              variant="ghost"
              onPress={() => chooseAction(null)}
            >
              Cancel
            </Button>
          </div>
          {action === 'template' ? (
            <ApplyTemplate
              clientId={clientId}
              done={() => {
                finishAction('Tracker template applied.');
              }}
            />
          ) : selected ? (
            <>
              <h3 className="editor-item-title">{selected.name}</h3>
              {action === 'add' ? (
                <AssignmentForm
                  clientId={clientId}
                  trackerId={selected.id}
                  done={() => {
                    finishAction('Tracker added.');
                  }}
                />
              ) : (
                <Button
                  isPending={changeRequest.isPending}
                  onPress={() => {
                    request({tracker_id: selected.id});
                  }}
                >
                  Request this Tracker
                </Button>
              )}
              <Button
                variant="ghost"
                onPress={() => {
                  actionVersion.current += 1;
                  setSelected(null);
                }}
              >
                Choose another Tracker
              </Button>
            </>
          ) : (
            <TrackerPicker onSelect={setSelected} />
          )}
        </Surface>
      )}
      <section className="client-section space-y-4">
        <h2 className="section-title">Tracker list</h2>
        {assignments.isPending && <p role="status">Loading Tracker list…</p>}
        {assignments.isError && (
          <>
            <FormError message="Could not refresh the Tracker list. Loaded Trackers remain visible." />
            <Button
              variant="outline"
              onPress={() => {
                assignments.refetch();
              }}
            >
              Retry Tracker list
            </Button>
          </>
        )}
        {assignments.data?.data.length === 0 && <p>No Trackers assigned. Add a Tracker or apply a template.</p>}
        <div className="space-y-4">
          {assignments.data?.data.map((assignment) => (
            <Assignment
              key={assignment.id}
              clientId={clientId}
              assignment={assignment}
            />
          ))}
        </div>
      </section>
      <section className="client-section space-y-4">
        <h2 className="section-title">Open requests</h2>
        {requests.isPending && <p role="status">Loading requests…</p>}
        {requests.isError && (
          <>
            <FormError message="Could not refresh requests. Loaded requests remain visible." />
            <Button
              variant="outline"
              onPress={() => {
                requests.refetch();
              }}
            >
              Retry requests
            </Button>
          </>
        )}
        {requests.data?.data.length === 0 && <p>No open requests.</p>}
        {requests.data?.data.map((value) => (
          <Surface
            key={value.id}
            className="space-y-3"
          >
            <h3 className="editor-item-title">{value.tracker.name}</h3>
            <p className="text-sm">
              Waiting on client since{' '}
              <time dateTime={value.requested_at}>{new Date(value.requested_at).toLocaleDateString()}</time>
            </p>
            <Button
              variant="outline"
              isPending={changeRequest.isPending}
              onPress={() => {
                request({id: value.id});
              }}
            >
              Cancel request
            </Button>
          </Surface>
        ))}
      </section>
    </Page>
  );
}

function Assignment({clientId, assignment}: {clientId: string; assignment: TrackerAssignment}) {
  const change = useChangeTrackerAssignment(clientId);
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  async function end() {
    setError('');
    try {
      await change.mutateAsync({action: 'end', id: assignment.id});
    } catch (cause) {
      setError(errorMessage(cause, 'Could not end the assignment.'));
    }
  }
  return (
    <Surface className="space-y-4">
      <div>
        <h3 className="editor-item-title">{assignment.tracker.name}</h3>
        <p className="text-sm text-muted-foreground">
          {trackerTimings.find(([value]) => value === assignment.timing)?.[1]}
          {assignment.timing === 'weekly' ? ` · ${trackerWeekdays[assignment.weekday ?? 6]}` : ''} · Since{' '}
          {assignment.starts_on}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          className={buttonVariants({variant: 'outline'})}
          to={`${generatePath(routes.recordTracker, {clientId})}?tracker_id=${assignment.tracker.id}`}
        >
          Record
        </Link>
        <Link
          className={buttonVariants({variant: 'outline'})}
          to={`${generatePath(routes.trackerHistory, {clientId})}?tracker_id=${assignment.tracker.id}`}
        >
          History
        </Link>
        <Button
          variant="ghost"
          onPress={() => setEditing(!editing)}
        >
          Change timing
        </Button>
        <Button
          variant="ghost"
          onPress={() => setEnding(true)}
        >
          End assignment
        </Button>
      </div>
      {editing && (
        <AssignmentForm
          clientId={clientId}
          trackerId={assignment.tracker.id}
          assignment={assignment}
          done={() => setEditing(false)}
        />
      )}
      {ending && (
        <div className="space-y-3">
          <p>Stop reminders for this Tracker now? All entries stay in history.</p>
          <Button
            variant="outline"
            isPending={change.isPending}
            onPress={() => {
              end();
            }}
          >
            Confirm end assignment
          </Button>
          <Button
            variant="ghost"
            onPress={() => setEnding(false)}
          >
            Keep assignment
          </Button>
        </div>
      )}
      <FormError message={error} />
    </Surface>
  );
}

function AssignmentForm({
  clientId,
  trackerId,
  assignment,
  done,
}: {
  clientId: string;
  trackerId: string;
  assignment?: TrackerAssignment;
  done: () => void;
}) {
  const form = useForm<{timing: AssignmentWrite['timing']; weekday: number}>({
    defaultValues: {timing: assignment?.timing ?? 'daily', weekday: assignment?.weekday ?? 6},
  });
  const change = useChangeTrackerAssignment(clientId);
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      const body = {timing: values.timing, ...(values.timing === 'weekly' ? {weekday: values.weekday} : {})};
      await change.mutateAsync(
        assignment
          ? {action: 'change', id: assignment.id, body}
          : {action: 'add', body: {...body, tracker_id: trackerId}},
      );
      done();
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'Could not save timing. Your values are still here.')});
    }
  });
  return (
    <form
      className="space-y-4"
      onSubmit={submit}
    >
      <TrackerTiming
        timing={form.watch('timing')}
        weekday={form.watch('weekday')}
        onChange={(timing, weekday) => {
          form.setValue('timing', timing);
          form.setValue('weekday', weekday);
        }}
      />
      <FormError message={form.formState.errors.root?.message} />
      <Button
        type="submit"
        isPending={change.isPending}
      >
        {assignment ? 'Save timing' : 'Add to Tracker list'}
      </Button>
    </form>
  );
}

function ApplyTemplate({clientId, done}: {clientId: string; done: () => void}) {
  const apply = useApplyTrackerTemplate(clientId);
  const [selected, setSelected] = useState<TrackerTemplate | null>(null);
  const [error, setError] = useState('');
  async function submit() {
    if (!selected) {
      return;
    }
    setError('');
    try {
      await apply.mutateAsync({id: selected.id, expected_revision: selected.revision});
      done();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not apply template. Select it again if it has changed.'));
    }
  }
  return (
    <div className="space-y-4">
      {selected ? (
        <>
          <h3 className="editor-item-title">{selected.name}</h3>
          <p>This replaces the client's current Tracker list. Recorded entries stay in history.</p>
          <Button
            isPending={apply.isPending}
            onPress={() => {
              submit();
            }}
          >
            Apply this template
          </Button>
          <Button
            variant="ghost"
            onPress={() => setSelected(null)}
          >
            Choose another template
          </Button>
        </>
      ) : (
        <TrackerTemplatePicker onSelect={setSelected} />
      )}
      <FormError message={error} />
    </div>
  );
}
