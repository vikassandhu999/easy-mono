import {generatePath, Link, useSearchParams} from 'react-router-dom';
import {useFormAssignments} from '../api/forms';
import {routes} from '../routes';
import {CachedRead} from '../ui/cached-read';
import {InfiniteList} from '../ui/infinite-list';
import {Page} from '../ui/page';

export function Forms() {
  const [params] = useSearchParams();
  const state = params.get('state') === 'history' ? 'history' : 'pending';
  const query = useFormAssignments({state});
  return (
    <Page
      title="Forms & check-ins"
      description="Your coach's requests and your saved responses."
      back={routes.home}
    >
      {params.get('photoRecovery') === 'failed' && (
        <p
          role="alert"
          className="mb-6 text-destructive"
        >
          Your photo could not be recovered after the app restarted. Open your form and choose it again.
        </p>
      )}
      <nav
        aria-label="Form views"
        className="mb-6 flex gap-6"
      >
        <Link
          to={routes.forms}
          aria-current={state === 'pending' ? 'page' : undefined}
          className="text-link"
        >
          To complete
        </Link>
        <Link
          to={`${routes.forms}?state=history`}
          aria-current={state === 'history' ? 'page' : undefined}
          className="text-link"
        >
          History
        </Link>
      </nav>
      {query.data && (
        <CachedRead
          updatedAt={query.dataUpdatedAt}
          failed={query.isError}
          refreshing={query.isFetching}
          refresh={() => query.refetch()}
        />
      )}
      <InfiniteList
        query={query}
        label="requests"
        singular="request"
        empty={
          <p className="py-6 text-muted-foreground">
            {state === 'pending'
              ? 'Nothing to complete right now. Your coach’s next request will appear here.'
              : 'Your completed and closed requests will appear here.'}
          </p>
        }
      >
        {(assignment) => (
          <Link
            to={`${generatePath(routes.form, {id: assignment.id})}?from=${state}`}
            className="block min-h-16 space-y-1 py-5"
          >
            <span className="block text-lg font-semibold">{assignment.form_template.name}</span>
            <span className="block text-sm text-muted-foreground">
              {assignment.purpose === 'intake' ? 'Getting to know you' : 'Check-in'}
              {assignment.due_date
                ? ` · Due ${new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}`
                : ''}
            </span>
            <span className="block text-sm">
              {state === 'pending'
                ? `${assignment.form_template.question_count} questions`
                : assignment.status === 'completed'
                  ? 'Response saved'
                  : assignment.status === 'missed'
                    ? 'Missed'
                    : 'Closed by your coach'}
            </span>
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
