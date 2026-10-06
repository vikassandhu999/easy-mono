import {Plus} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useBusiness} from '../api/business';
import {type ReviewRosterFilters, useReviewRoster} from '../api/reviews';
import {assessmentLabels, dueLabel} from '../reviews/review';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {clientStateLabels} from './coaching';

const filterOptions = {
  due: [
    ['due', 'Due'],
    ['overdue', 'Overdue'],
    ['not_due', 'Not due'],
    ['inactive', 'No current term'],
  ],
  last_reviewed: [
    ['never', 'Never this term'],
    ['reviewed', 'Reviewed this term'],
  ],
  assessment: Object.entries(assessmentLabels),
  unread: [
    ['true', 'Unread chat'],
    ['false', 'No unread chat'],
  ],
  waiting: [
    ['true', 'Waiting on client'],
    ['false', 'No open requests'],
  ],
  state: Object.entries(clientStateLabels),
  sort: [
    ['due', 'Due'],
    ['name', 'Client name'],
    ['last_reviewed', 'Last reviewed'],
    ['assessment', 'Assessment'],
    ['unread_chat', 'Unread chat'],
    ['waiting_since', 'Waiting since'],
  ],
  direction: [
    ['asc', 'Ascending'],
    ['desc', 'Descending'],
  ],
};
const labels = {
  due: 'Review due',
  last_reviewed: 'Last reviewed',
  assessment: 'Assessment',
  unread: 'Chat',
  waiting: 'Requests',
  state: 'Coaching',
  sort: 'Sort by',
  direction: 'Order',
};
export function Clients() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.get('search')?.trim() ?? '';
  const filters: ReviewRosterFilters = {q: search};
  for (const key of Object.keys(filterOptions) as (keyof typeof filterOptions)[]) {
    const value = params.get(key);
    if (filterOptions[key].some(([option]) => option === value)) {
      Object.assign(filters, {[key]: key === 'unread' || key === 'waiting' ? value === 'true' : value});
    }
  }
  const clients = useReviewRoster(filters);
  const business = useBusiness();
  function changeFilter(name: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === 'all') {
          next.delete(name);
        } else {
          next.set(name, value);
        }
        return next;
      },
      {replace: true},
    );
  }
  return (
    <Page className="client-page">
      <PageHeader
        title="Clients"
        description={
          business.data
            ? `${business.data.data.seats.used} of ${business.data.data.seats.limit} seats used · Your daily review roster`
            : 'Your daily review roster.'
        }
        actions={
          <Link
            className={buttonVariants()}
            to={routes.inviteClient}
            state={{listSearch: location.search}}
          >
            <Plus aria-hidden="true" />
            Invite client
          </Link>
        }
      />
      <ListSearch label="Search clients" />
      <details
        className="rounded-xl border border-border p-4"
        open={Boolean(location.search)}
      >
        <summary className="cursor-pointer font-medium">Sort and filter clients</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(filterOptions) as (keyof typeof filterOptions)[]).map((key) => (
            <div
              key={key}
              className="space-y-2"
            >
              <p className="text-sm font-medium">{labels[key]}</p>
              <SelectField
                aria-label={labels[key]}
                value={params.get(key) ?? (key === 'sort' ? 'due' : key === 'direction' ? 'asc' : 'all')}
                onChange={(value) => changeFilter(key, value)}
              >
                {key !== 'sort' && key !== 'direction' && <SelectItem id="all">All</SelectItem>}
                {filterOptions[key].map(([value, label]) => (
                  <SelectItem
                    key={value}
                    id={value ?? ''}
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          ))}
        </div>
      </details>
      <InfiniteList
        query={clients}
        label="clients"
        singular="client"
        empty={
          <Surface>
            <h2 className="section-title">No matching clients</h2>
            <p>Change the filters or invite a client.</p>
          </Surface>
        }
      >
        {(person) => (
          <article className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  className="text-link break-words text-lg font-semibold"
                  to={generatePath(routes.client, {id: person.client_id})}
                  state={{listSearch: location.search}}
                >
                  {person.preferred_name || person.full_name || 'Client'}
                </Link>
                <p className="text-sm text-muted-foreground">{person.email || person.phone}</p>
                <p className="text-sm text-muted-foreground">Coach: {person.coach_name}</p>
              </div>
              <StatusBadge tone={person.due ? 'neutral' : 'positive'}>{dueLabel(person)}</StatusBadge>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Last reviewed</dt>
                <dd>
                  {person.last_reviewed_at ? new Date(person.last_reviewed_at).toLocaleDateString() : 'Never this term'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Assessment</dt>
                <dd>{person.assessment ? assessmentLabels[person.assessment] : 'No assessment'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Chat</dt>
                <dd>
                  <Link
                    className="text-link"
                    to={generatePath(routes.clientConversation, {clientId: person.client_id})}
                  >
                    {person.unread_chat} unread
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Requests</dt>
                <dd>
                  {person.waiting_since
                    ? `Waiting on client since ${new Date(person.waiting_since).toLocaleDateString()}`
                    : 'No open requests'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({variant: 'outline'})}
                to={generatePath(routes.newReview, {clientId: person.client_id})}
                state={{listSearch: location.search}}
              >
                Review
              </Link>
              <Link
                className={buttonVariants({variant: 'ghost'})}
                to={generatePath(routes.reviews, {clientId: person.client_id})}
              >
                Review history
              </Link>
            </div>
          </article>
        )}
      </InfiniteList>
    </Page>
  );
}
