import {ChevronRight} from 'lucide-react';
import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useProspects} from '../api/prospects';
import {routes} from '../routes';
import {InfiniteList} from '../ui/infinite-list';
import {Label} from '../ui/label';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {applicationStatus, readApplicationStatus} from './application-labels';

export function Applications() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const status = readApplicationStatus(params.get('status'));
  const search = params.get('search') ?? '';
  const query = useProspects({search, ...(status ? {status} : {})});
  const summary = query.data?.pages[0]?.summary;
  return (
    <Page>
      <PageHeader
        title="Applications"
        description="Get to know the people interested in your coaching."
        actions={
          <Link
            className="text-link"
            to={routes.coachingPage}
          >
            Coaching page
          </Link>
        }
      />
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <ListSearch
          label="Search applications"
          placeholder="Name, contact or program"
        />
        <div className="space-y-2">
          <Label
            id="application-status-filter-label"
            htmlFor="application-status-filter"
          >
            Status
          </Label>
          <SelectField
            id="application-status-filter"
            value={status ?? 'all'}
            onChange={(value) =>
              setParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.set('status', value);
                  return next;
                },
                {replace: true},
              )
            }
          >
            <SelectItem id="all">All applications</SelectItem>
            <SelectItem id="new">New{summary ? ` (${summary.new})` : ''}</SelectItem>
            <SelectItem id="reviewing">In review{summary ? ` (${summary.reviewing})` : ''}</SelectItem>
            <SelectItem id="won">Accepted{summary ? ` (${summary.won})` : ''}</SelectItem>
            <SelectItem id="lost">Closed{summary ? ` (${summary.lost})` : ''}</SelectItem>
          </SelectField>
        </div>
      </div>
      <InfiniteList
        query={query}
        label="applications"
        singular="application"
        empty={
          <Surface className="space-y-3 py-10 text-center">
            <h2 className="section-title">
              {search ? 'No matching applications' : status === 'new' ? 'No new applications' : 'No applications here'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Try another name, contact detail or program.'
                : 'Share your coaching page to invite interest, or choose another status.'}
            </p>
            {!search && (
              <Link
                className="text-link"
                to={routes.coachingPage}
              >
                Open coaching page
              </Link>
            )}
          </Surface>
        }
      >
        {(application) => (
          <Link
            className="flex items-center gap-4 p-5 hover:bg-muted/50 focus-visible:-outline-offset-4"
            to={generatePath(routes.application, {id: application.id})}
            state={{listSearch: location.search}}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="break-words font-semibold">{application.name}</h2>
                <StatusBadge tone={application.status === 'new' ? 'positive' : 'neutral'}>
                  {applicationStatus[application.status]}
                </StatusBadge>
              </div>
              <p className="break-words text-sm text-muted-foreground">
                {application.program?.name || 'General coaching application'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(application.inserted_at))}
              </p>
            </div>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
