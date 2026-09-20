import {Check, ChevronRight, ClipboardList} from 'lucide-react';
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
      compact
      title="Forms & check-ins"
      description="A little reflection. A step forward."
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
        className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1"
      >
        <Link
          to={routes.forms}
          aria-current={state === 'pending' ? 'page' : undefined}
          className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold ${state === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
        >
          To complete
        </Link>
        <Link
          to={`${routes.forms}?state=history`}
          aria-current={state === 'history' ? 'page' : undefined}
          className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold ${state === 'history' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
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
          <p className="rounded-3xl bg-[var(--progress)] p-6 leading-relaxed">
            {state === 'pending'
              ? 'Nothing to complete right now. Your coach’s next request will appear here.'
              : 'Your completed and closed requests will appear here.'}
          </p>
        }
      >
        {(assignment) => (
          <Link
            to={`${generatePath(routes.form, {id: assignment.id})}?from=${state}`}
            className="flex min-h-20 items-center gap-3 py-5"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--training)] text-primary">
              {assignment.status === 'completed' ? (
                <Check
                  aria-hidden="true"
                  className="size-5"
                />
              ) : (
                <ClipboardList
                  aria-hidden="true"
                  className="size-5"
                />
              )}
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-base font-bold">{assignment.form_template.name}</span>
              <span className="block text-sm text-muted-foreground">
                {assignment.purpose === 'intake' ? 'Getting to know you' : 'Check-in'}
                {assignment.due_date
                  ? ` · Due ${new Date(`${assignment.due_date}T12:00:00`).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}`
                  : ''}
              </span>
              <span className="block text-sm font-medium text-primary">
                {state === 'pending'
                  ? `${assignment.form_template.question_count} questions`
                  : assignment.status === 'completed'
                    ? 'Response saved'
                    : assignment.status === 'missed'
                      ? 'Missed'
                      : 'Closed by your coach'}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}
