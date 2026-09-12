import {ArrowRight} from 'lucide-react';
import {generatePath, Link, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {useCheckInResponses} from '../api/check-in-responses';
import {errorMessage} from '../api/client';
import {type Client, useClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function CheckInResponses() {
  return <ResponseList />;
}

export function ClientCheckInResponses() {
  const {clientId = ''} = useParams();
  const query = useClient(clientId);
  if (query.data) {
    return (
      <ResponseList
        key={clientId}
        person={query.data.data}
      />
    );
  }
  return (
    <Page>
      <PageHeader
        title="Client check-ins"
        back={{to: generatePath(routes.client, {id: clientId}), label: 'Back to client'}}
      />
      <Surface>
        {query.isPending ? (
          <p role="status">Loading client…</p>
        ) : (
          <div className="space-y-4">
            <FormError message={errorMessage(query.error, 'Could not load this client.')} />
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </Surface>
    </Page>
  );
}

function ResponseList({person}: {person?: Client}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const requested = params.get('status');
  const status =
    requested === 'all' || requested === 'reviewed' || requested === 'needs-review'
      ? requested
      : person
        ? 'all'
        : 'needs-review';
  const query = useCheckInResponses({
    search: params.get('search')?.trim() ?? '',
    ...(person ? {client_id: person.id} : {}),
    ...(status === 'all' ? {} : {reviewed: status === 'reviewed'}),
  });
  const name = person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client' : '';
  const hasSearch = Boolean(params.get('search')?.trim());
  return (
    <Page>
      <PageHeader
        title={person ? `Responses from ${name}` : 'Check-ins'}
        description={
          person
            ? 'Read progress updates and revisit previous reviews.'
            : 'Read your clients’ progress updates and keep track of what needs your attention.'
        }
        {...(person
          ? {
              back: {to: generatePath(routes.client, {id: person.id}), label: 'Back to client'},
              actions: (
                <Link
                  to={generatePath(routes.clientCheckIns, {id: person.id})}
                  className={buttonVariants({variant: 'outline'})}
                >
                  Manage schedules
                </Link>
              ),
            }
          : {})}
      />
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_12rem]">
        <ListSearch
          label="Search check-ins"
          placeholder={person ? 'Search by form name' : 'Search by client or form'}
        />
        <div className="grid gap-2">
          <span
            id="review-status-label"
            className="text-sm font-medium"
          >
            Show
          </span>
          <SelectField
            id="review-status"
            value={status}
            onChange={(value) => {
              if (value === 'all' || value === 'reviewed' || value === 'needs-review') {
                setParams(
                  (previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('status', value);
                    return next;
                  },
                  {replace: true},
                );
              }
            }}
          >
            <SelectItem id="needs-review">Needs review</SelectItem>
            <SelectItem id="all">All responses</SelectItem>
            <SelectItem id="reviewed">Reviewed</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="check-in responses"
        singular="check-in response"
        empty={
          <Surface>
            <h2 className="section-title">
              {hasSearch
                ? 'No matching responses'
                : status === 'needs-review'
                  ? 'No check-ins waiting for review'
                  : status === 'reviewed'
                    ? 'No reviewed check-ins yet'
                    : 'No responses yet'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasSearch
                ? 'Try another client or form name.'
                : status === 'needs-review'
                  ? 'New submissions will appear here. You can find past check-ins under All responses.'
                  : status === 'reviewed'
                    ? 'Reviewed responses stay here for future reference.'
                    : 'Responses appear here after your client submits a check-in.'}
            </p>
          </Surface>
        }
      >
        {(submission) => {
          const clientName =
            `${submission.client.first_name ?? ''} ${submission.client.last_name ?? ''}`.trim() ||
            submission.client.email ||
            'Client';
          const formName = submission.form_assignment.form_template.name;
          const to = person
            ? generatePath(routes.clientCheckInResponse, {clientId: person.id, id: submission.id})
            : generatePath(routes.checkInResponse, {id: submission.id});
          return (
            <Link
              to={to}
              state={{listSearch: location.search}}
              className="block p-5 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              aria-label={`Read ${formName}${person ? '' : ` from ${clientName}`}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-lg font-semibold">{person ? formName : clientName}</h2>
                  {!person && <p className="break-words text-sm">{formName}</p>}
                </div>
                <ArrowRight
                  className="mt-1 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <StatusBadge tone={submission.reviewed_at ? 'positive' : 'neutral'}>
                  {submission.reviewed_at ? 'Reviewed' : 'Needs review'}
                </StatusBadge>
                <p className="text-sm text-muted-foreground">
                  Submitted{' '}
                  <time dateTime={submission.submitted_at}>
                    {new Date(submission.submitted_at).toLocaleDateString(undefined, {dateStyle: 'medium'})}
                  </time>
                </p>
                {submission.form_assignment.due_date && (
                  <p className="text-sm text-muted-foreground">
                    Due{' '}
                    <time dateTime={submission.form_assignment.due_date}>{submission.form_assignment.due_date}</time>
                  </p>
                )}
              </div>
            </Link>
          );
        }}
      </InfiniteList>
    </Page>
  );
}
