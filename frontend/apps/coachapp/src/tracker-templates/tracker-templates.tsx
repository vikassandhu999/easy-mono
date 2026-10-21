import {generatePath, Link, useLocation, useSearchParams} from 'react-router-dom';
import {useTrackerTemplates} from '../api/trackers';
import {routes} from '../routes';
import {buttonVariants} from '../ui/button';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';

export function TrackerTemplates() {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useTrackerTemplates(params.get('search') ?? '');
  return (
    <Page>
      <PageHeader
        title="Tracker templates"
        description="Reusable Tracker lists. Each client receives an independent copy."
        actions={
          <Link
            className={buttonVariants()}
            to={routes.createTrackerTemplate}
          >
            Create template
          </Link>
        }
      />
      <nav
        aria-label="Tracker library"
        className="flex gap-5 border-b border-border pb-3"
      >
        <Link
          className="text-link"
          to={routes.trackers}
        >
          Library
        </Link>
        <Link
          className="text-link"
          to={routes.trackerTemplates}
        >
          Templates
        </Link>
      </nav>
      <ListSearch label="Search Tracker templates" />
      <InfiniteList
        query={query}
        label="Tracker templates"
        singular="Tracker template"
        empty={<Surface>No Tracker templates match your search.</Surface>}
      >
        {(template) => (
          <Link
            to={generatePath(routes.trackerTemplate, {id: template.id})}
            state={{listSearch: search}}
            className="block space-y-1 p-5 hover:bg-muted"
          >
            <h2 className="font-semibold break-words">{template.name}</h2>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
