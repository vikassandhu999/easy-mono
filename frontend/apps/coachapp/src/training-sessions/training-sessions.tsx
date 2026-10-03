import {ArrowRight} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {type SessionFilters, useTrainingSessions} from '../api/training-sessions';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {sessionStateLabels, sessionTitle} from './session';

export function TrainingSessions() {
  const {clientId = ''} = useParams();
  return (
    <History
      key={clientId}
      clientId={clientId}
    />
  );
}

function History({clientId}: {clientId: string}) {
  const person = useClient(clientId);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const rawState = params.get('state');
  const state = rawState === 'active' || rawState === 'completed' || rawState === 'discarded' ? rawState : undefined;
  const query = useTrainingSessions(clientId, {
    ...(from ? {from} : {}),
    ...(to ? {to} : {}),
    ...(state ? {state} : {}),
    search: params.get('search')?.trim() || '',
  });
  const client = person.data?.data;
  const name = client ? client.preferred_name || client.full_name || client.email || 'Client' : 'Client';
  return (
    <Page>
      <PageHeader
        title={`Training history for ${name}`}
        description="Read recorded sessions and the targets your client started with."
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      {!client ? (
        <Surface>
          {person.isPending ? (
            <p role="status">Loading client…</p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(person.error, 'Could not load this client.')} />
              <Button
                onPress={() => {
                  person.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      ) : (
        <>
          <div className="space-y-4">
            <div className="grid items-end gap-4 sm:grid-cols-[1fr_12rem]">
              <ListSearch
                label="Search sessions"
                placeholder="Search by workout name"
              />
              <div className="grid gap-2">
                <span
                  id="session-state-label"
                  className="text-sm font-medium"
                >
                  Show
                </span>
                <SelectField
                  id="session-state"
                  value={state || 'all'}
                  onChange={(value) =>
                    setParams(
                      (previous) => {
                        const next = new URLSearchParams(previous);
                        if (value === 'active' || value === 'completed' || value === 'discarded') {
                          next.set('state', value);
                        } else {
                          next.delete('state');
                        }
                        return next;
                      },
                      {replace: true},
                    )
                  }
                >
                  <SelectItem id="all">All sessions</SelectItem>
                  <SelectItem id="completed">Completed</SelectItem>
                  <SelectItem id="active">In progress</SelectItem>
                  <SelectItem id="discarded">Discarded</SelectItem>
                </SelectField>
              </div>
            </div>
            <DateRange
              key={`${from}:${to}`}
              from={from}
              to={to}
              onApply={(values) =>
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    if (values.from) {
                      next.set('from', values.from);
                    } else {
                      next.delete('from');
                    }
                    if (values.to) {
                      next.set('to', values.to);
                    } else {
                      next.delete('to');
                    }
                    return next;
                  },
                  {replace: true},
                )
              }
            />
          </div>
          <InfiniteList
            query={query}
            label="training sessions"
            singular="training session"
            empty={
              <Surface>
                <h2 className="section-title">
                  {from || to || state || params.get('search') ? 'No matching sessions' : 'No training sessions yet'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {from || to || state || params.get('search')
                    ? 'Try another workout name, date range or session status.'
                    : 'Sessions will appear here when your client records a workout.'}
                </p>
              </Surface>
            }
          >
            {(session) => (
              <Link
                to={generatePath(routes.trainingSession, {clientId, id: session.id})}
                state={{listSearch: location.search}}
                className="block p-5 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                aria-label={`Read ${sessionTitle(session)} on ${session.date}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="break-words text-lg font-semibold">{sessionTitle(session)}</h2>
                  <ArrowRight
                    className="mt-1 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <StatusBadge tone={session.state === 'completed' ? 'positive' : 'neutral'}>
                    {sessionStateLabels[session.state]}
                  </StatusBadge>
                  <time
                    className="text-sm text-muted-foreground"
                    dateTime={session.date}
                  >
                    {session.date}
                  </time>
                </div>
                {session.kind === 'planned' && session.prescription_snapshot && (
                  <p className="mt-2 wrap-anywhere text-sm text-muted-foreground">
                    {session.prescription_snapshot.plan.name}
                  </p>
                )}
              </Link>
            )}
          </InfiniteList>
        </>
      )}
    </Page>
  );
}

function DateRange({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (values: Pick<SessionFilters, 'from' | 'to'>) => void;
}) {
  const form = useForm<Pick<SessionFilters, 'from' | 'to'>>({defaultValues: {from, to}});
  return (
    <form
      noValidate
      className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[12rem_12rem_auto]"
      onSubmit={form.handleSubmit((values) => {
        if (values.from && values.to && values.to < values.from) {
          form.setError('to', {message: 'End date must be on or after start date.'}, {shouldFocus: true});
          return;
        }
        onApply(values);
      })}
    >
      <FormField
        control={form.control}
        name="from"
        label="From date"
        type="date"
      />
      <FormField
        control={form.control}
        name="to"
        label="To date"
        type="date"
      />
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:pt-7">
        <Button
          type="submit"
          variant="outline"
        >
          Apply dates
        </Button>
        {(from || to || form.formState.isDirty) && (
          <Button
            variant="ghost"
            onPress={() => {
              form.reset({from: '', to: ''});
              onApply({});
            }}
          >
            Clear dates
          </Button>
        )}
      </div>
    </form>
  );
}
