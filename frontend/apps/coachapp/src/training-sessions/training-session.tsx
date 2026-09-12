import {generatePath, Link, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useTrainingSession} from '../api/training-sessions';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {sessionStateLabels, sessionTitle, setTypeLabels, setValues} from './session';

export function TrainingSession() {
  const {clientId = '', id = ''} = useParams();
  return (
    <SessionRecord
      key={`${clientId}:${id}`}
      clientId={clientId}
      id={id}
    />
  );
}

function SessionRecord({clientId, id}: {clientId: string; id: string}) {
  const query = useTrainingSession(clientId, id);
  const client = useClient(clientId);
  const {to, state} = useListLocation(generatePath(routes.trainingSessions, {clientId}));
  const back = {to, state, label: 'Back to training history'};
  const session = query.data?.data;
  if (!session) {
    const missing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 422);
    return (
      <Page>
        <PageHeader
          title={missing ? 'Session not found' : 'Training session'}
          back={back}
        />
        <Surface>
          {query.isPending ? (
            <div
              role="status"
              className="animate-pulse space-y-6"
            >
              <p>Loading session…</p>
              <div className="h-6 w-1/2 rounded bg-muted" />
              <div className="h-24 rounded bg-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              <FormError
                message={
                  missing
                    ? 'This session is unavailable or you no longer have access to it.'
                    : errorMessage(query.error, 'Could not load this training session.')
                }
              />
              {!missing && (
                <Button
                  onPress={() => {
                    query.refetch();
                  }}
                >
                  Try again
                </Button>
              )}
              <Link
                to={to}
                state={state}
                className="text-link"
              >
                Return to training history
              </Link>
            </div>
          )}
        </Surface>
      </Page>
    );
  }
  const person = client.data?.data;
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'View client';
  const snapshot = session.prescription_snapshot;
  return (
    <Page>
      <PageHeader
        title={sessionTitle(session)}
        back={back}
        description={
          <Link
            to={generatePath(routes.client, {id: clientId})}
            className="text-link"
          >
            {name}
          </Link>
        }
        actions={
          <Button
            variant="outline"
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Refresh session
          </Button>
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={session.state === 'completed' ? 'positive' : 'neutral'}>
            {sessionStateLabels[session.state]}
          </StatusBadge>
          <time dateTime={session.date}>{session.date}</time>
        </div>
        <p className="text-sm text-muted-foreground">
          Started{' '}
          <time dateTime={session.started_at}>
            {new Date(session.started_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
          </time>
          {session.closed_at && (
            <>
              {' '}
              · {session.state === 'discarded' ? 'Discarded' : 'Finished'}{' '}
              <time dateTime={session.closed_at}>
                {new Date(session.closed_at).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
              </time>
            </>
          )}
        </p>
        {session.state === 'active' && (
          <p className="text-sm">Your client is still recording this session. Refresh to see their latest changes.</p>
        )}
        {session.state === 'discarded' && (
          <p className="text-sm">
            Your client discarded this session. These entries are retained as history; the session was not completed.
          </p>
        )}
        {query.isError && <FormError message="Could not refresh this session. Showing the previously loaded record." />}
      </div>
      {(session.soreness_rating !== null || session.notes) && (
        <Surface className="space-y-3">
          <h2 className="section-title">From your client</h2>
          {session.soreness_rating !== null && (
            <p className="text-sm">
              Soreness: <span className="font-semibold">{session.soreness_rating} / 5</span>
            </p>
          )}
          {session.notes && <p className="whitespace-pre-wrap break-words leading-relaxed">{session.notes}</p>}
        </Surface>
      )}
      <section
        aria-label="Recorded work"
        className="space-y-4"
      >
        <h2 className="section-title">Recorded work</h2>
        {session.performed_sets.length === 0 ? (
          <Surface>
            <p className="font-medium">No sets recorded</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {session.state === 'active'
                ? 'Your client has not recorded a set yet.'
                : 'No performed sets were saved with this session.'}
            </p>
          </Surface>
        ) : (
          <ol className="divide-y divide-border">
            {session.performed_sets.map((set, index) => (
              <li
                key={set.id}
                className="py-4 first:pt-0"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-5 gap-y-2">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">{set.exercise_name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set {index + 1} · {setTypeLabels[set.set_type]}
                    </p>
                  </div>
                  <p className="break-words text-sm leading-relaxed">{setValues(set) || 'No measurements recorded'}</p>
                  {set.notes && (
                    <p className="col-span-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {set.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      {snapshot ? (
        <details className="group border-t border-border pt-5">
          <summary className="min-h-12 cursor-pointer font-semibold">View original prescription</summary>
          <div className="mt-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              {snapshot.plan.name} · Targets saved when this session began.
            </p>
            {snapshot.workout.exercises.length === 0 && (
              <p className="text-sm text-muted-foreground">No exercises were saved in this prescription.</p>
            )}
            {snapshot.workout.exercises.map((exercise) => (
              <section
                key={exercise.ref}
                className="space-y-3"
                aria-label={`Original targets for ${exercise.exercise_name}`}
              >
                <h3 className="break-words text-lg font-semibold">{exercise.exercise_name}</h3>
                {exercise.sets.length === 0 && <p className="text-sm text-muted-foreground">No sets prescribed.</p>}
                <ol className="space-y-3">
                  {exercise.sets.map((set, index) => (
                    <li
                      key={`${exercise.ref}:${index}`}
                      className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="text-muted-foreground">Set {index + 1}</span>
                      <p>{setValues(set) || 'Targets not specified'}</p>
                      <p className="col-start-2 text-xs text-muted-foreground">
                        {set.set_type ? setTypeLabels[set.set_type] : 'Set type not specified'}
                        {set.rest_seconds !== null && ` · Rest ${set.rest_seconds} sec`}
                      </p>
                      {set.notes && (
                        <p className="col-start-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {set.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">
          {session.kind === 'freestyle'
            ? 'Freestyle sessions have no prescribed targets.'
            : 'The original prescription is unavailable.'}
        </p>
      )}
      <Link
        to={to}
        state={state}
        className="text-link"
      >
        Return to training history
      </Link>
    </Page>
  );
}
