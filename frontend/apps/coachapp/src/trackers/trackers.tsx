import {generatePath, Link, NavLink, useLocation, useSearchParams} from 'react-router-dom';
import {type Tracker, useTrackers} from '../api/trackers';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export function Trackers() {
  const [params, setParams] = useSearchParams();
  const {search} = useLocation();
  const kind = params.get('kind') as Tracker['kind'] | null;
  const query = useTrackers({
    search: params.get('search') ?? '',
    ...(kind ? {kind} : {}),
    archived: params.get('archived') === 'true',
  });
  const setFilter = (name: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
      return next;
    });
  return (
    <Page>
      <PageHeader
        title="Trackers"
        description="Values, reflections, photos, and reports your clients record."
        actions={
          <Link
            className={buttonVariants()}
            to={routes.createTracker}
            state={{listSearch: search}}
          >
            Create Tracker
          </Link>
        }
      />
      <nav
        aria-label="Tracker library"
        className="flex gap-5 border-b border-border pb-3"
      >
        <NavLink
          className="text-link"
          to={routes.trackers}
        >
          Library
        </NavLink>
        <NavLink
          className="text-link"
          to={routes.trackerTemplates}
        >
          Templates
        </NavLink>
      </nav>
      <div className="grid gap-4 sm:grid-cols-3">
        <ListSearch label="Search Trackers" />
        <SelectField
          aria-label="Tracker kind"
          value={kind ?? ''}
          onChange={(value) => setFilter('kind', value)}
        >
          <SelectItem id="">All kinds</SelectItem>
          {['number', 'rating', 'yes_no', 'text', 'photo', 'document'].map((value) => (
            <SelectItem
              key={value}
              id={value}
            >
              {value.replace('_', '/')}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          aria-label="Tracker status"
          value={params.get('archived') === 'true' ? 'true' : ''}
          onChange={(value) => setFilter('archived', value)}
        >
          <SelectItem id="">Active</SelectItem>
          <SelectItem id="true">Archived</SelectItem>
        </SelectField>
      </div>
      <InfiniteList
        query={query}
        label="Trackers"
        singular="Tracker"
        empty={<Surface>No Trackers match your search.</Surface>}
      >
        {(tracker) => (
          <Link
            to={generatePath(routes.tracker, {id: tracker.id})}
            state={{listSearch: search}}
            className="block space-y-1 p-5 hover:bg-muted"
          >
            <h2 className="font-semibold break-words">{tracker.name}</h2>
            <p className="text-sm text-muted-foreground">
              {tracker.built_in ? 'Built-in' : 'Custom'} · {tracker.kind.replace('_', '/')} {tracker.base_unit ?? ''} ·{' '}
              {tracker.entry_count} entries
            </p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
